# Coffee Delivery


## Overview

Portal of coffee delivery solution. Target users are below roles in coffee shop:

- Operator, who creates coffee shop, analyse the sales figures, performance of coffee makers and drivers, etc.
- Product Manager, who creates coffee products and analyse the sales figures, etc.
- Coffee Maker, who receives orders placed by customers and makes coffee accordingly.

The other two parts of coffee delivery solution are:

- [CoffeeMe](https://github.com/leonardean/CoffeeMe), a mobile app for consumers to place orders on coffee shops.
- [CoffeeDrive](https://github.com/leonardean/CoffeeDrive), a mobile app for the drivers who deliver coffee between coffee shops and consumers.

**Notice**

- Portal and the two mobile apps have no dependency with each other's interface directly, all of them are utilizing Kii Cloud as backend and interact with the same Kii App.
- The recommended browser is Chrome, some scripts are not supported by IE, the other browsers are not tested.

More details of coffee delivery solution can be found in the project folder.

## Deployment

This portal is pure html5/javascript program with Kii Cloud as backend for data storage, user management, etc so can run in any web server such as Tomcat, IIS.

The recommendation here is nodejs `http-server`.

#### Step 1. Install `http-server`

> If `http-server` already installed on your server, please skip this step.

Installation via `npm`:

```
npm install http-server -g
```

This will install `http-server` globally so that it may be run from the command line.

#### Step 2. Set Environment (Optional)

"Environment" refers to Kii App here, below information should be specified in the head section of `./js/common.js`:

- var KII\_APP\_ID
- var KII\_APP\_KEY
- var KII\_SITE

#### Step 3. Startup Portal

In root folder of this repository, run below command to start `http-server`:

```
http-server
```

It will open port 8080 by default and portal is available there with url [http://localhost:8080/page/index.html](http://localhost:8080/page/index.html).

------

# Driver Emulator

## Overview

To emulate the drivers moving on the map in portal, a nodejs program `driver-emulator` is also added under this repository, emulating with the sensors uploading random location data as thing-state.

## Deployment

#### Step 1. Install Dependency Package

Run below command to install the package required by this program:

```
npm install
```

#### Step 2. Set Environment (Optional)

"Environment" refers to Kii App here, below information in `./driver-emulator/constants.json` should be consistent with the ones in `./js/common.js`:

- site
- appID
- appKey

#### Step 3. Create Sensor Owner (Optional)

With below command in folder `driver-emulator`, a pseudo user will be created as sensor owner, the pseudo user's owner id and token will be written into `./driver-emulator/constants.json` automatically and used for the sensor onboarding later.

```
node generateOwnerInfo.js
```

> A pseudo user's owner id and token are already in `./driver-emulator/constants.json` from the repository, so this step can be skipped, unless need to change to another Kii App.

#### Step 4. Create Sensor Config (Optional)

If need to create a new sensor, a file with name `constants_{sensor_name}.json` should be created under folder `driver-emulator` as this new sensor's config. 

There are `constants_sensor1.json`, `constants_sensor2.json` and `constants_sensor3.json` already created, can refer to these files for the config format.

**Config format details:**

Below fields in config file are consistent with the basic concepts of onboarding on Kii Cloud:

- vendorThingID
- password
- thingType
- dataGroupingInterval

For the other fields:

- randomStates: specify whether or not generate thing state randomly, please keep it as `true`.
- pilotInterval: the interval of uploading thing state, in `ms`.
- schema: defines the thing state, in our case of Coffee Delivery, please do make it with below thing states (refer to `constants_sensor1.json`).
	- lat: the latitude of location; under it, please keep `type` as `float` and `controllable` as `true`, `min` and `max` define the min and max value of the automatically generated latitude by this emulator.
	- lon: the longitude of locaiton; similar as `lat`.
	- driver_id: the driver information; under it, please keep `type` as `string` and `controllable` as `true`, fill `value` with the Kii user id of driver in Kii App.

#### Step 5. Startup Emulator

Run below command under folder `driver-emulator` to start emulator:

```
./start.sh {sensor_name}
```

> - the `{sensor_name}` must be consistent with the one in the corresponding config file name `constants_{sensor_name}.json`.
> - to emulate multiple sensors, please run above command in new command line window with different sensor config.








