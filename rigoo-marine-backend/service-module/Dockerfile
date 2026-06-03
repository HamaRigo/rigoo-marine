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

RUN mvn -B dependency:resolve -pl common-security,service-module --fail-never -q

COPY common-security/src  common-security/src
# Install common modules into the local repo first.
RUN mvn -B install -pl common-security -DskipTests -q

COPY service-module/src      service-module/src
RUN mvn -B package -pl service-module -DskipTests -q

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/service-module/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
