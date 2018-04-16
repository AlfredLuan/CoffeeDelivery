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

#### Step 2. Choose Environment

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
