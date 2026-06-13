# 游泳馆票务与储物柜管理系统

市体育中心游泳馆票务与储物柜一体化管理系统。

## 技术栈
- 前端：React 18 + TypeScript + Ant Design + Vite
- 后端：NestJS + TypeORM + PostgreSQL
- 部署：Docker + Nginx

## 功能模块
- 票务管理（单次票、次卡、月卡）
- 储物柜管理（4区400柜，实时状态）
- 二维码核销
- 三级审批流程
- 数据统计与预警
- 操作日志留痕

## 快速启动

```bash
docker-compose up -d
```

访问地址：
- 前台/管理后台：http://localhost
- API接口：http://localhost:3000/api
- 接口文档：http://localhost:3000/api/docs
