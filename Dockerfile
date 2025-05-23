FROM nginx:1.28-alpine

# 公開用静的ファイルをNginxの公開ディレクトリにコピー
COPY public/ /usr/share/nginx/html/

# 必要ならカスタム設定を適用
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]