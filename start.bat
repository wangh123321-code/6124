@echo off
echo ========================================
echo 游泳馆票务柜子管理系统 - 启动脚本
echo ========================================

echo [1/3] 构建后端镜像...
cd backend
if not exist node_modules (
    echo 安装后端依赖...
    call npm install
)
cd ..

echo [2/3] 构建前端镜像...
cd frontend
if not exist node_modules (
    echo 安装前端依赖...
    call npm install
)
cd ..

echo [3/3] 启动所有服务...
docker-compose up -d --build

echo.
echo ========================================
echo 服务启动完成！
echo 前台/后台: http://localhost
echo API接口:   http://localhost:3000/api
echo 接口文档:  http://localhost:3000/api/docs
echo ========================================
pause
