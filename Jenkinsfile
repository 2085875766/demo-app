pipeline {
  agent {
    kubernetes {
      cloud 'kubernetes'
      namespace 'cicd'
      defaultContainer 'jnlp'
    }
  }

  environment {
    APP_NAME = "myapp"
    REGISTRY = "harbor.lab.local"
    PROJECT = "demo"
    IMAGE_REPO = "${REGISTRY}/${PROJECT}/${APP_NAME}"
    GITOPS_REPO = "https://github.com/2085875766/demo-gitops.git"
    GITOPS_BRANCH = "main"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test') {
      steps {
        container('node') {
          sh '''
            npm install
            npm test
          '''
        }
      }
    }

    stage('Build & Push') {
      steps {
        container('docker') {
          withCredentials([usernamePassword(
            credentialsId: 'harbor-robot',
            usernameVariable: 'HARBOR_USER',
            passwordVariable: 'HARBOR_PASS'
          )]) {
            sh '''
              # 等待 Docker 守护进程启动
              while ! docker info 2>/dev/null; do
                echo "Waiting for Docker daemon..."
                sleep 2
              done

              docker build -t ${IMAGE_REPO}:latest .
              echo ${HARBOR_PASS} | docker login ${REGISTRY} -u ${HARBOR_USER} --password-stdin
              docker push ${IMAGE_REPO}:latest
            '''
          }
        }
      }
    }

    stage('Update GitOps Repo') {
      steps {
        container('jnlp') {
          withCredentials([usernamePassword(
            credentialsId: 'gitops-pat',
            usernameVariable: 'GIT_USER',
            passwordVariable: 'GIT_PASS'
          )]) {
            sh '''
              git clone https://${GIT_USER}:${GIT_PASS}@github.com/2085875766/demo-gitops.git gitops
              cd gitops/charts/myapp
              sed -i "s|tag:.*|tag: latest|g" values.yaml
              git config user.email "jenkins@lab.local"
              git config user.name "jenkins"
              git add values.yaml
              git commit -m "Update image tag to latest" || true
              git push origin main
            '''
          }
        }
      }
    }
  }
}
