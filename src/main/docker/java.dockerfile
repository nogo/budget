FROM eclipse-temurin:21-jdk-jammy as build

WORKDIR application
COPY gradle/ ./gradle
COPY src/ ./src
COPY gradlew build.gradle settings.gradle ./

RUN ./gradlew build
RUN mkdir -p build/target && java -Djarmode=layertools -jar build/libs/application.jar extract --destination build/target

FROM eclipse-temurin:21-jre-jammy
MAINTAINER Danilo Kuehn <me@ctl.wtf>

WORKDIR application
COPY --from=build /application/build/target/dependencies/ ./
COPY --from=build /application/build/target/spring-boot-loader/ ./
COPY --from=build /application/build/target/application/ ./
ENTRYPOINT ["java","org.springframework.boot.loader.launch.JarLauncher"]