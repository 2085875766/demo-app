pipeline {
  agent any

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
        sh '''
          echo "Running tests..."
          npm install
          npm test
        '''
      }
    }

    stage('Build & Push') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'harbor-robot',
          usernameVariable: 'HARBOR_USER',
          passwordVariable: 'HARBOR_PASS'
        )]) {
          sh '''
            set -eux
            SHORT_SHA=$(git rev-parse --short HEAD)
            echo "Building image: ${IMAGE_REPO}:${SHORT_SHA}"
            docker build -t ${IMAGE_REPO}:${SHORT_SHA} .
            echo "${HARBOR_PASS}" | docker login ${REGISTRY} -u "${HARBOR_USER}" --password-stdin
            docker push ${IMAGE_REPO}:${SHORT_SHA}
            echo ${SHORT_SHA} > image-tag.txt
          '''
        }
      }
    }

    stage('Update GitOps Repo') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'gitops-pat',
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_PASS'
        )]) {
          sh '''
            set -eux
            IMAGE_TAG=$(cat image-tag.txt)
            git clone https://${GIT_USER}:${GIT_PASS}@github.com/2085875766/demo-gitops.git gitops
            cd gitops/charts/myapp
            sed -i "s|tag:.*|tag: ${IMAGE_TAG}|g" values.yaml
            git config user.email "jenkins@lab.local"
            git config user.name "jenkins"
            git add values.yaml
            git commit -m "Update image tag to ${IMAGE_TAG}" || true
            git push origin main
          '''
        }
      }
    }
  }
}
