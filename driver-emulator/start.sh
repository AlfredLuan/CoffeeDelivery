thing=$1

if [[ $thing == "" ]]; then
	echo "Please input param 'light', 'sensor' or 'aircondition'"
	echo "    for example: ./start.sh light"
	exit 1
fi

node index.js --constants=./constants_${thing}.json  --states=./states_${thing}.json

