# 删除旧的
rm -r -force dist/听力测试平台-win32-x64

# 创建目录结构
mkdir dist\听力测试平台-win32-x64\resources\app

# 复制 Electron 运行文件
copy node_modules\electron\dist\* dist\听力测试平台-win32-x64\

# 复制项目文件
copy *.js dist\听力测试平台-win32-x64\resources\app\
copy *.html dist\听力测试平台-win32-x64\resources\app\
copy *.css dist\听力测试平台-win32-x64\resources\app\
copy package.json dist\听力测试平台-win32-x64\resources\app\

# 复制静态资源（如果有的话）
if (Test-Path public) { xcopy public dist\听力测试平台-win32-x64\resources\app\public\ /E /I /Y }
if (Test-Path models) { xcopy models dist\听力测试平台-win32-x64\resources\app\models\ /E /I /Y }

# 复制 node_modules
xcopy node_modules dist\听力测试平台-win32-x64\resources\app\node_modules\ /E /I /Y

# 重命名
ren dist\听力测试平台-win32-x64\electron.exe "听力测试平台.exe"