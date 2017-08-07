{
    "kiicloud://groups/*/buckets/shop_info": [{
        "when": "DATA_OBJECT_CREATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onShopInfoUpdated"
    },
    {
        "when": "DATA_OBJECT_UPDATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onShopInfoUpdated"
    },
    {
        "when": "DATA_OBJECT_DELETED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onShopInfoDeleted"
    }],
    "kiicloud://groups": [{
        "when": "GROUP_CREATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onGroupCreated"
    }],
    "kiicloud://users": [{
        "when": "USER_CREATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onUserInfoUpdated"
    },
    {
        "when": "USER_UPDATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onUserInfoUpdated"
    },
    {
        "when": "USER_DELETED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onUserInfoDeleted"
    }],
    "kiicloud://buckets/orders": [{
        "when": "DATA_OBJECT_CREATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onOrderUpdated"
    },
    {
        "when": "DATA_OBJECT_UPDATED",
        "what": "EXECUTE_SERVER_CODE",
        "endpoint": "onOrderUpdated"
    }]
    /* Other paths with hooks */
}
