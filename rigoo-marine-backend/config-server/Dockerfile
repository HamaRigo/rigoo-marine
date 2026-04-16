FROM eclipse-temurin:17-jre
WORKDIR /app
COPY rigoo-marine-backend/config-server/target/*.jar app.jar
EXPOSE 8888
ENTRYPOINT ["java", "-jar", "app.jar"]
