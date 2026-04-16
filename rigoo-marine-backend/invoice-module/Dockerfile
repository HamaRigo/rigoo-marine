FROM eclipse-temurin:17-jre
WORKDIR /app
COPY rigoo-marine-backend/invoice-module/target/*.jar app.jar
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
