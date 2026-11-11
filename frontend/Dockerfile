# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Khai báo build-time arg cho Vite
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Cài đặt dependencies
COPY package*.json ./
RUN npm ci

# Sao chép mã nguồn và build ứng dụng
COPY . .
RUN npm run build

# Production stage với Nginx Alpine siêu nhẹ (~20MB)
FROM nginx:alpine AS final

# Xóa trang mặc định của nginx
RUN rm -rf /usr/share/nginx/html/*

# Sao chép output build từ stage trước
COPY --from=build /app/dist /usr/share/nginx/html

# Sao chép cấu hình Nginx SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
