{
  "kiicloud://groups/*/buckets/shop_info": [
    {
      "when": "DATA_OBJECT_CREATED",
      "what": "EXECUTE_SERVER_CODE",
      "endpoint": "updateShopInfo"
    },
    {
      "when": "DATA_OBJECT_UPDATED",
      "what": "EXECUTE_SERVER_CODE",
      "endpoint": "updateShopInfo"
    }
  ],
  "kiicloud://groups": [
    {
      "when": "GROUP_CREATED",
      "what": "EXECUTE_SERVER_CODE",
      "endpoint": "registerShopTopic"
    }
  ]
  /* Other paths with hooks */
}
