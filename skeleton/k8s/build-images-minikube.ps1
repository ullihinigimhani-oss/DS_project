$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\Lihini\Desktop\DS\DS_project"

Write-Host "Building Arogya images into Minikube..." -ForegroundColor Cyan

minikube image build -t arogya/frontend:local -f "$projectRoot\frontend\Dockerfile" "$projectRoot\frontend" --build-arg VITE_API_BASE_URL=/api
minikube image build -t arogya/gateway:local -f "$projectRoot\gateway\Dockerfile" "$projectRoot\gateway"
minikube image build -t arogya/auth-service:local -f "$projectRoot\services\auth-service\Dockerfile" "$projectRoot\services\auth-service"
minikube image build -t arogya/patient-service:local -f "$projectRoot\services\patient-service\Dockerfile" "$projectRoot\services\patient-service"
minikube image build -t arogya/doctor-service:local -f "$projectRoot\services\doctor-service\Dockerfile" "$projectRoot\services\doctor-service"
minikube image build -t arogya/appointment-service:local -f "$projectRoot\services\appointment-service\Dockerfile" "$projectRoot\services\appointment-service"
minikube image build -t arogya/telemedicine-service:local -f "$projectRoot\services\telemedicine-service\Dockerfile" "$projectRoot\services\telemedicine-service"
minikube image build -t arogya/payment-service:local -f "$projectRoot\services\payment-service\Dockerfile" "$projectRoot\services\payment-service"
minikube image build -t arogya/notification-service:local -f "$projectRoot\services\notification-service\Dockerfile" "$projectRoot\services\notification-service"
minikube image build -t arogya/ai-symptom-service:local -f "$projectRoot\services\ai-symptom-service\Dockerfile" "$projectRoot\services\ai-symptom-service"
minikube image build -t arogya/ai-ml-service:local -f "$projectRoot\services\ai-symptom-service\ml-integration\Dockerfile" "$projectRoot"

Write-Host "All Minikube images built successfully." -ForegroundColor Green
