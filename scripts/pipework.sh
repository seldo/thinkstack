#!/bin/bash
set -e

IFNAME=$1
GUESTNAME=$2
IPADDR=$3

# First step: determine type of first argument (bridge, physical interface...)
if [ -d /sys/class/net/$IFNAME ]
then
    if [ -d /sys/class/net/$IFNAME/bridge ]
    then IFTYPE=bridge
    else IFTYPE=phys
    fi
else
    case "$IFNAME" in
	br*)
	    IFTYPE=bridge
	    ;;
	*)
	    echo "I do not know how to setup interface $IFNAME."
	    exit 1
	    ;;
    esac
fi

# Second step: find the guest (for now, we only support LXC containers)
CGROUPMNT=$(grep ^cgroup.*devices /proc/mounts | cut -d" " -f2 | head -n 1)
[ "$CGROUPMNT" ] || {
    echo "Could not locate cgroup mount point."
    exit 1
}

N=$(find "$CGROUPMNT" -name "$GUESTNAME*" | wc -l)
case "$N" in
    0)
	echo "Could not find any container matching $GUESTNAME."
	exit 1
	;;
    1)
	true
	;;
    *)
	echo "Found more than one container matching $GUESTNAME."
	exit 1
	;;
esac

NSPID=$(head -n 1 $(find "$CGROUPMNT" -name "$GUESTNAME*" | head -n 1)/tasks)
[ "$NSPID" ] || {
    echo "Could not find a process inside container $GUESTNAME."
    exit 1
}
mkdir -p /var/run/netns
rm -f /var/run/netns/$NSPID
ln -s /proc/$NSPID/ns/net /var/run/netns/$NSPID


# Check if we need to create a bridge.
[ $IFTYPE = bridge ] && [ ! -d /sys/class/net/$IFNAME ] && {
    brctl addbr $IFNAME
    ifconfig $IFNAME up
}

# If it's a bridge, we need to create a veth pair
[ $IFTYPE = bridge ] && {
    LOCAL_IFNAME=vethl$NSPID
    GUEST_IFNAME=vethg$NSPID
    ip link add name $LOCAL_IFNAME type veth peer name $GUEST_IFNAME
    brctl addif $IFNAME $LOCAL_IFNAME
    ip link set $LOCAL_IFNAME up
}

# If it's a physical interface, create a macvlan subinterface
[ $IFTYPE = phys ] && {
    GUEST_IFNAME=macvlan$NSPID
    ip link add link $IFNAME dev $GUEST_IFNAME type macvlan mode bridge
    ip link set $IFNAME up
}

ip link set $GUEST_IFNAME netns $NSPID
ip netns exec $NSPID ip link set $GUEST_IFNAME name eth1
ip netns exec $NSPID ifconfig eth1 $IPADDR