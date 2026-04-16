FROM eclipse-temurin:17-jre
WORKDIR /app
COPY rigoo-marine-backend/client-module/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
