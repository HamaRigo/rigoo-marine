FROM eclipse-temurin:17-jre
WORKDIR /app
COPY rigoo-marine-backend/discovery-service/target/*.jar app.jar
EXPOSE 8761
ENTRYPOINT ["java", "-jar", "app.jar"]
