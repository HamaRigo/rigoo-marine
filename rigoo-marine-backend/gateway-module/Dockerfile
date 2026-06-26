FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn -B install -N -q
COPY common-exceptions/pom.xml   common-exceptions/pom.xml
COPY common-security/pom.xml     common-security/pom.xml
COPY config-server/pom.xml       config-server/pom.xml
COPY discovery-service/pom.xml   discovery-service/pom.xml
COPY gateway-module/pom.xml      gateway-module/pom.xml
COPY client-module/pom.xml       client-module/pom.xml
COPY vessel-module/pom.xml       vessel-module/pom.xml
COPY service-module/pom.xml      service-module/pom.xml
COPY work-order-module/pom.xml   work-order-module/pom.xml
COPY technician-module/pom.xml   technician-module/pom.xml
COPY invoice-module/pom.xml      invoice-module/pom.xml
COPY notification-module/pom.xml notification-module/pom.xml
COPY marketplace-module/pom.xml  marketplace-module/pom.xml
COPY shop-module/pom.xml         shop-module/pom.xml
COPY maintenance-module/pom.xml  maintenance-module/pom.xml
COPY delivery-module/pom.xml    delivery-module/pom.xml

RUN mvn -B dependency:resolve -pl gateway-module --fail-never -q

ARG BUILD_SHA=unknown
RUN echo "build-sha=${BUILD_SHA}"
COPY gateway-module/src gateway-module/src
RUN mvn -B package -pl gateway-module -DskipTests -q

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/gateway-module/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
