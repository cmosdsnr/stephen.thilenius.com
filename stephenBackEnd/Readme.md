# backend documentation - Readme.md

- backend uses node.js and typescript
- locally compiled with `yarn build` and `yarn dev`
- deploy with go.bat "optional tag" -> deploys to 'stephen' dokku container
  
## use yarn docs:generate to generate and deploy docs to server 

Read documents at /documents/frontend or backend

## Remote variables
Remote .env had PORT=5000 and STATIC="/storage/static"

## setup local storage
dokku apps:create servert
dokku storage:mount servert '/media/cmosdsnr/passport/galleries:/app/galleries'
dokku storage:mount servert '/var/lib/dokku/data/storage/server:/app/storage'

## link the networks
dokku network:set pbNetwork attach-post-create servert
dokku network:set servert attach-post-create pbNetwork

dokku nginx:set servert client-max-body-size 10G

dokku letsencrypt:enable servert
dokku ps:restart servert



## Git commands
git remote remove github 
git remote add github https://github.com/cmosdsnr/server.thilenius.git

git remote add dokku_alec dokku@thilenius.org:servert
git remote add budd dokku@buddbliss.com:servert

## find large files in history
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch 'storage/shares/t t.txt'" --prune-empty --tag-name-filter cat -- --all

## remove that large file
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sed -n 's/^blob //p' | & 'C:\Program Files (x86)\GnuWin32\bin\sort' ...

## Important note!
Rewriten and organized server code in July 2023
******  RUN 'yarn tsc' BEFORE UPLOADING! server expect precompiled tsc in the dist directory

## conflicting directories in /media
cd /media/cmosdsnr
lsblk -o NAME,MOUNTPOINT,UUID,FSTYPE,SIZE
sudo umount /media/cmosdsnr/passport1
sudo rm -rf passport; 
sudo mkdir -p /media/cmosdsnr/passport; 
sudo mount /dev/sdb1 /media/cmosdsnr/passport