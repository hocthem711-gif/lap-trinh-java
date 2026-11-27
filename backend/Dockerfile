# ===================================================
# Dockerfile Multi-Stage Build cho Smart Farm Backend
# ===================================================

# Stage 1: Build JAR package
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /build

# Copy pom.xml và tải trước dependency để tối ưu cache
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy mã nguồn và đóng gói JAR
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime image siêu nhẹ với JRE 17 Alpine
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Tạo non-root user tăng cường bảo mật container
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser:appgroup

# Copy file JAR từ Stage 1
COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080

# Healthcheck kiểm tra trạng thái container tự động (Dev 1 - LTJ-36)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
