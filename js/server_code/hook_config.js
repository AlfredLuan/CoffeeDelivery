{
    "kiicloud://groups/*/buckets/shop_info": [{
        "when": "DATA_OBJECT_CREATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "updateShopInfo"
    },
    {
        "when": "DATA_OBJECT_UPDATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "updateShopInfo"
    },
    {
        "when": "DATA_OBJECT_DELETED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "deleteShopInfo"
    }],
    "kiicloud://groups": [{
        "when": "GROUP_CREATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "registerShopTopic"
    }],
    "kiicloud://users": [{
        "when": "USER_CREATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "updateUserInfo"
    },
    {
        "when": "USER_UPDATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "updateUserInfo"
    },
    {
        "when": "USER_DELETED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "deleteUserInfo"
    }]
    /* Other paths with hooks */
}
