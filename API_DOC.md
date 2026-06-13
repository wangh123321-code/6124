# 游泳馆票务柜子管理系统 - API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **接口文档 (Swagger)**: `http://localhost:3000/api/docs`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON

---

## 目录

1. [认证模块](#1-认证模块)
2. [票务模块](#2-票务模块)
3. [储物柜模块](#3-储物柜模块)
4. [审批模块](#4-审批模块)
5. [统计模块](#5-统计模块)
6. [用户模块](#6-用户模块)
7. [WebSocket 实时推送](#7-websocket-实时推送)

---

## 1. 认证模块

### 1.1 用户登录

**接口**: `POST /api/auth/login`

**权限**: 公开

**请求参数**:

| 参数名   | 类型   | 必填 | 说明   |
| -------- | ------ | ---- | ------ |
| username | string | 是   | 用户名 |
| password | string | 是   | 密码   |

**请求示例**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应参数**:

| 参数名      | 类型   | 说明                 |
| ----------- | ------ | -------------------- |
| token       | string | JWT 访问令牌         |
| user        | object | 用户信息             |
| user.id     | string | 用户ID               |
| user.username | string | 用户名             |
| user.name   | string | 用户姓名             |
| user.phone  | string | 手机号               |
| user.role   | string | 角色 (admin/manager/finance/front_desk/customer) |
| user.isActive | boolean | 是否启用         |

**响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-string",
    "username": "admin",
    "name": "系统管理员",
    "phone": "13800000001",
    "role": "admin",
    "isActive": true
  }
}
```

---

### 1.2 用户注册

**接口**: `POST /api/auth/register`

**权限**: 公开

**请求参数**:

| 参数名   | 类型   | 必填 | 说明     |
| -------- | ------ | ---- | -------- |
| username | string | 是   | 用户名   |
| password | string | 是   | 密码     |
| name     | string | 是   | 姓名     |
| phone    | string | 否   | 手机号   |

**响应参数**: 同登录接口

---

### 1.3 获取当前用户信息

**接口**: `GET /api/auth/profile`

**权限**: 已登录用户

**请求头**: `Authorization: Bearer {token}`

**响应参数**: 用户详细信息（同登录返回的 user 对象 + createdAt, updatedAt）

---

## 2. 票务模块

### 2.1 创建订单（售票）

**接口**: `POST /api/tickets/orders`

**权限**: 前台、管理员、游客

**请求参数**:

| 参数名        | 类型   | 必填 | 说明                                       |
| ------------- | ------ | ---- | ------------------------------------------ |
| ticketType    | string | 是   | 票卡类型：single(单次票)/times_card(次卡)/monthly_card(月卡) |
| ticketName    | string | 是   | 票卡名称                                   |
| totalTimes    | number | 否   | 总次数（次卡必填）                         |
| validDays     | number | 否   | 有效天数（月卡必填）                       |
| amount        | number | 否   | 金额（留空使用默认价格）                   |
| paymentMethod | string | 否   | 支付方式：cash/wechat/alipay/card         |

**请求示例** (次卡):
```json
{
  "ticketType": "times_card",
  "ticketName": "10次卡",
  "totalTimes": 10,
  "amount": 270,
  "paymentMethod": "wechat"
}
```

**响应参数**:

| 参数名      | 类型   | 说明         |
| ----------- | ------ | ------------ |
| order       | object | 订单信息     |
| ticket      | object | 票卡信息     |

**响应示例**:
```json
{
  "order": {
    "id": "uuid",
    "orderNo": "TK202401011200001234",
    "amount": 270.00,
    "status": "paid",
    "ticketType": "times_card",
    "ticketName": "10次卡",
    "userId": "uuid",
    "ticketId": "uuid",
    "sellerId": "uuid",
    "paymentMethod": "wechat",
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "ticket": {
    "id": "uuid",
    "type": "times_card",
    "name": "10次卡",
    "price": 270.00,
    "totalTimes": 10,
    "usedTimes": 0,
    "validDays": null,
    "expireAt": null,
    "status": "active",
    "qrCode": "data:image/png;base64,...",
    "pickupCode": "123456",
    "userId": "uuid",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 2.2 核销票卡

**接口**: `POST /api/tickets/verify`

**权限**: 前台、管理员

**请求参数**:

| 参数名     | 类型   | 必填 | 说明                         |
| ---------- | ------ | ---- | ---------------------------- |
| ticketId   | string | 否   | 票卡ID（与qrCode、pickupCode三选一） |
| qrCode     | string | 否   | 二维码数据                   |
| pickupCode | string | 否   | 取件码                       |
| lockerId   | string | 否   | 关联储物柜ID                 |

**并发控制**: 使用数据库悲观锁，确保同一张票不会被同时核销两次。

**响应参数**:

| 参数名  | 类型   | 说明             |
| ------- | ------ | ---------------- |
| ticket  | object | 核销后的票卡信息 |
| record  | object | 使用记录         |

---

### 2.3 我的票卡列表

**接口**: `GET /api/tickets/my`

**权限**: 游客、前台、管理员

**查询参数**:

| 参数名   | 类型   | 必填 | 说明                     |
| -------- | ------ | ---- | ------------------------ |
| type     | string | 否   | 票卡类型筛选             |
| status   | string | 否   | 状态筛选                 |
| page     | number | 否   | 页码，默认1              |
| pageSize | number | 否   | 每页条数，默认10         |

**响应参数**:

| 参数名   | 类型   | 说明     |
| -------- | ------ | -------- |
| list     | array  | 票卡列表 |
| total    | number | 总数     |
| page     | number | 当前页   |
| pageSize | number | 页大小   |

---

### 2.4 票卡详情

**接口**: `GET /api/tickets/:id`

**权限**: 游客（仅自己的）、前台、管理员

**路径参数**:

| 参数名 | 类型   | 必填 | 说明   |
| ------ | ------ | ---- | ------ |
| id     | string | 是   | 票卡ID |

**响应参数**: 票卡详细信息

---

### 2.5 票卡使用记录

**接口**: `GET /api/tickets/:id/usage-records`

**权限**: 游客、前台、管理员

**响应参数**: 使用记录数组

---

### 2.6 订单列表

**接口**: `GET /api/tickets/orders/list`

**权限**: 前台、管理员、游客（仅自己的）

**查询参数**:

| 参数名     | 类型   | 必填 | 说明     |
| ---------- | ------ | ---- | -------- |
| status     | string | 否   | 订单状态 |
| ticketType | string | 否   | 票卡类型 |
| page       | number | 否   | 页码     |
| pageSize   | number | 否   | 页大小   |

---

### 2.7 订单详情

**接口**: `GET /api/tickets/orders/:id`

**权限**: 前台、管理员、游客（仅自己的）

---

## 3. 储物柜模块

### 3.1 柜子列表

**接口**: `GET /api/lockers`

**权限**: 已登录用户

**查询参数**:

| 参数名 | 类型   | 必填 | 说明                           |
| ------ | ------ | ---- | ------------------------------ |
| zone   | string | 否   | 区域：A/B/C/D                  |
| status | string | 否   | 状态：free/in_use/reserved/faulty |

**响应参数**: 柜子列表数组

每个柜子对象包含：

| 参数名          | 类型    | 说明                 |
| --------------- | ------- | -------------------- |
| id              | string  | 柜子ID               |
| lockerNo        | string  | 柜号（如 A001）      |
| zone            | string  | 区域                 |
| position        | number  | 位置编号             |
| status          | string  | 状态                 |
| usedAt          | Date    | 开始使用时间         |
| pickupCode      | string  | 取件码               |
| isOverdueReminded | boolean | 是否已提醒超时   |
| currentUserId   | string  | 当前使用用户ID       |
| ticketId        | string  | 关联票卡ID           |
| version         | number  | 版本号（乐观锁用）   |

---

### 3.2 柜子统计信息

**接口**: `GET /api/lockers/statistics`

**权限**: 已登录用户

**响应参数**:

| 参数名   | 类型   | 说明       |
| -------- | ------ | ---------- |
| total    | number | 总柜子数   |
| free     | number | 空闲数     |
| inUse    | number | 使用中数量 |
| reserved | number | 预留数量   |
| faulty   | number | 故障数量   |
| overdue  | number | 超时数量   |

---

### 3.3 按区域统计

**接口**: `GET /api/lockers/zone-statistics`

**权限**: 已登录用户

**响应参数**: 各区统计数组，每项包含 zone、total、free、inUse、reserved、faulty

---

### 3.4 按区查询柜子

**接口**: `GET /api/lockers/zone/:zone`

**权限**: 已登录用户

**路径参数**: zone = A/B/C/D

---

### 3.5 查询单个柜子

**接口**: `GET /api/lockers/:lockerNo`

**权限**: 已登录用户

---

### 3.6 柜子操作日志

**接口**: `GET /api/lockers/:lockerNo/logs`

**权限**: 已登录用户

---

### 3.7 开柜

**接口**: `POST /api/lockers/open`

**权限**: 已登录用户

**并发控制**: 使用数据库悲观写锁 (`pessimistic_write`)，确保同一柜子不能被同时打开。

**请求参数**:

| 参数名     | 类型   | 必填 | 说明                                   |
| ---------- | ------ | ---- | -------------------------------------- |
| lockerNo   | string | 是   | 柜号                                   |
| openMethod | string | 是   | 开柜方式：bluetooth(蓝牙)/pickup_code(取件码) |
| pickupCode | string | 否   | 取件码（取件码方式时必填）             |

**响应参数**: 更新后的柜子信息

---

### 3.8 关柜

**接口**: `POST /api/lockers/close`

**权限**: 已登录用户

**请求参数**:

| 参数名   | 类型   | 必填 | 说明 |
| -------- | ------ | ---- | ---- |
| lockerNo | string | 是   | 柜号 |

---

### 3.9 预留柜子

**接口**: `POST /api/lockers/reserve`

**权限**: 已登录用户

**请求参数**:

| 参数名   | 类型   | 必填 | 说明 |
| -------- | ------ | ---- | ---- |
| lockerNo | string | 是   | 柜号 |

---

### 3.10 取消预留

**接口**: `POST /api/lockers/cancel-reserve`

**权限**: 已登录用户（仅自己预留的）

**请求参数**:

| 参数名   | 类型   | 必填 | 说明 |
| -------- | ------ | ---- | ---- |
| lockerNo | string | 是   | 柜号 |

---

### 3.11 强制清柜

**接口**: `POST /api/lockers/force-clear`

**权限**: 管理员

**说明**: 使用超过24小时的柜子才能强制清柜

**请求参数**:

| 参数名   | 类型   | 必填 | 说明   |
| -------- | ------ | ---- | ------ |
| lockerNo | string | 是   | 柜号   |
| reason   | string | 否   | 清柜原因 |

---

### 3.12 标记故障

**接口**: `POST /api/lockers/set-faulty`

**权限**: 管理员

**请求参数**:

| 参数名   | 类型   | 必填 | 说明     |
| -------- | ------ | ---- | -------- |
| lockerNo | string | 是   | 柜号     |
| remark   | string | 否   | 故障备注 |

---

### 3.13 修复柜子

**接口**: `POST /api/lockers/repair`

**权限**: 管理员

**请求参数**:

| 参数名   | 类型   | 必填 | 说明     |
| -------- | ------ | ---- | -------- |
| lockerNo | string | 是   | 柜号     |
| remark   | string | 否   | 修复备注 |

---

### 3.14 检查超时并提醒

**接口**: `POST /api/lockers/check-overdue`

**权限**: 管理员

**说明**: 检查使用超过4小时未关闭的柜子，标记为已提醒

**响应**: 超时提醒的柜子数量

---

## 4. 审批模块

### 4.1 创建审批申请

**接口**: `POST /api/approvals`

**权限**: 已登录用户

**请求参数**:

| 参数名       | 类型   | 必填 | 说明                     |
| ------------ | ------ | ---- | ------------------------ |
| type         | string | 是   | 类型：refund(退卡)/exchange(换票) |
| ticketId     | string | 是   | 票卡ID                   |
| refundAmount | number | 否   | 退款金额（退卡时）       |
| reason       | string | 否   | 申请原因                 |

**审批流程**: 前台申请 → 主管审核 → 财务确认

---

### 4.2 审批列表

**接口**: `GET /api/approvals`

**权限**: 已登录用户

**查询参数**:

| 参数名   | 类型   | 必填 | 说明     |
| -------- | ------ | ---- | -------- |
| status   | string | 否   | 状态筛选 |
| type     | string | 否   | 类型筛选 |
| page     | number | 否   | 页码     |
| pageSize | number | 否   | 页大小   |

**审批状态枚举**:
- `pending_front_desk`: 待前台审核
- `pending_manager`: 待主管审核
- `pending_finance`: 待财务确认
- `approved`: 已通过
- `rejected`: 已拒绝

---

### 4.3 审批详情

**接口**: `GET /api/approvals/:id`

**权限**: 已登录用户

**响应参数**: 包含申请人、票卡、各环节审批人及时间等完整信息

---

### 4.4 前台审核通过

**接口**: `POST /api/approvals/:id/front-desk/approve`

**权限**: 前台

**请求参数**:

| 参数名 | 类型   | 必填 | 说明   |
| ------ | ------ | ---- | ------ |
| remark | string | 否   | 审核意见 |

---

### 4.5 主管审核通过

**接口**: `POST /api/approvals/:id/manager/approve`

**权限**: 主管

---

### 4.6 财务确认通过

**接口**: `POST /api/approvals/:id/finance/approve`

**权限**: 财务

**说明**: 财务确认后，退卡申请会将票卡状态改为已退款

---

### 4.7 拒绝审批

**接口**: `POST /api/approvals/:id/reject`

**权限**: 前台、主管、财务（各自环节）

**请求参数**:

| 参数名 | 类型   | 必填 | 说明     |
| ------ | ------ | ---- | -------- |
| remark | string | 是   | 拒绝原因 |

---

## 5. 统计模块

### 5.1 今日数据概览

**接口**: `GET /api/statistics/today-overview`

**权限**: 已登录用户

**响应参数**:
```json
{
  "visitor": { "todayCount": 156 },
  "sales": { "todayOrders": 89, "todayAmount": 12580.00 },
  "locker": {
    "total": 400,
    "inUse": 320,
    "free": 75,
    "usageRate": 80.0,
    "isWarning": false
  }
}
```

---

### 5.2 今日客流曲线

**接口**: `GET /api/statistics/visitor-flow`

**权限**: 已登录用户

**响应参数**: 24小时数组，每项包含 hour(小时) 和 count(人数)

---

### 5.3 各时段柜子使用率

**接口**: `GET /api/statistics/locker-usage`

**权限**: 已登录用户

**响应参数**: 24小时数组，每项包含 hour、openCount、totalLockers、usageRate、isWarning

---

### 5.4 票卡销售占比

**接口**: `GET /api/statistics/ticket-sales`

**权限**: 已登录用户

**响应参数**:
```json
{
  "list": [
    {
      "ticketType": "times_card",
      "ticketName": "10次卡",
      "salesCount": 45,
      "totalAmount": 12150.00,
      "countRatio": 50.56,
      "amountRatio": 60.23
    }
  ],
  "totalSales": 89,
  "totalAmount": 20170.00
}
```

---

### 5.5 柜子使用率预警

**接口**: `GET /api/statistics/locker-warning`

**权限**: 已登录用户

**响应参数**:
```json
{
  "totalLockers": 400,
  "inUseLockers": 365,
  "usageRate": 91.25,
  "isWarning": true,
  "warningThreshold": 90
}
```

**预警规则**: 使用率超过 90% 时触发黄色预警

---

## 6. 用户模块

### 6.1 用户列表

**接口**: `GET /api/users`

**权限**: 管理员

---

### 6.2 创建用户

**接口**: `POST /api/users`

**权限**: 管理员

---

### 6.3 更新用户

**接口**: `PUT /api/users/:id`

**权限**: 管理员

---

## 7. WebSocket 实时推送

### 7.1 连接地址

`ws://localhost:3000/locker`

### 7.2 推送事件

| 事件名             | 触发时机               | 数据内容               |
| ------------------ | ---------------------- | ---------------------- |
| `lockerUpdated`    | 柜子状态变化时         | 单个柜子信息对象       |
| `statisticsUpdated`| 统计数据更新（每分钟） | 统计数据+各区统计+使用率 |
| `lockerWarning`    | 柜子使用率超过90%时    | 预警信息对象           |

### 7.3 前端接入示例

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/locker');

socket.on('lockerUpdated', (locker) => {
  console.log('柜子状态更新:', locker);
});

socket.on('statisticsUpdated', (stats) => {
  console.log('统计数据更新:', stats);
});

socket.on('lockerWarning', (warning) => {
  console.warn('柜子使用率预警:', warning);
});
```

---

## 8. 并发控制说明

### 8.1 售票并发控制
- 使用数据库事务 + 行级锁
- 确保库存正确扣减（如有库存限制）

### 8.2 票卡核销并发控制
- 使用 `pessimistic_write` 悲观写锁
- 同一张票不能被同时核销两次

### 8.3 储物柜并发控制
- 使用 `pessimistic_write` 悲观写锁
- 同一柜子不能被同时打开
- 版本号 `version` 字段用于乐观锁校验

### 8.4 审批并发控制
- 状态流转校验，确保按顺序审批
- 同一环节只能审批一次

---

## 9. 默认账号

| 角色     | 用户名     | 密码        |
| -------- | ---------- | ----------- |
| 管理员   | admin      | admin123    |
| 主管     | manager    | manager123  |
| 财务     | finance    | finance123  |
| 前台     | frontdesk  | front123    |
| 游客     | customer1  | customer123 |

---

## 10. 状态码说明

| HTTP 状态码 | 说明                       |
| ----------- | -------------------------- |
| 200         | 成功                       |
| 201         | 创建成功                   |
| 400         | 请求参数错误               |
| 401         | 未登录或Token过期          |
| 403         | 无权限访问                 |
| 404         | 资源不存在                 |
| 409         | 资源冲突（如用户名重复）   |
| 500         | 服务器内部错误             |
