FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

COPY pom.xml .
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

RUN mvn -B dependency:resolve -pl common-security,common-exceptions,client-module --fail-never -q

COPY common-security/src    common-security/src
COPY common-exceptions/src  common-exceptions/src
COPY client-module/src      client-module/src
RUN mvn -B package -pl client-module -am -DskipTests -q

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/client-module/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
