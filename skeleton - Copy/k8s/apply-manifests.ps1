$ErrorActionPreference = "Stop"

$manifestDir = "C:\Users\Lihini\Desktop\DS\DS_project\skeleton\k8s"

Write-Host "Applying Arogya Kubernetes manifests..." -ForegroundColor Cyan

kubectl apply -f "$manifestDir\00-namespace.yaml"
kubectl apply -f "$manifestDir\01-secrets.yaml"
kubectl apply -f "$manifestDir\02-configmap.yaml"
kubectl apply -f "$manifestDir\03-databases.yaml"
kubectl apply -f "$manifestDir\04-messaging.yaml"
kubectl apply -f "$manifestDir\05-services.yaml"
kubectl apply -f "$manifestDir\06-ingress.yaml"

Write-Host "Deployment submitted. Current pods:" -ForegroundColor Green
kubectl get pods -n healthcare
