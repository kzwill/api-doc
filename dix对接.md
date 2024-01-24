# dix 对接

**文件位置**

```
将lib中的jar包引入后端项目中去
```

**配置参数**

```js
// dix的部署url
dix.url=http://182.92.207.12/dix
```

**示例代码**

```java
JSONObject jsonObject = JSONUtil.parseObj(body);
String projectId = jsonObject.getStr("projectId");//项目id
Integer maxPort = jsonObject.getInt("maxPort");//最大端口号
Integer minPort = jsonObject.getInt("minPort");//最小端口号
String url = DixProvider.getProvider().getConsoleUrl(projectId, maxPort, minPort);
```
