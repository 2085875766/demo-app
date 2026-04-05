pipeline {
  agent {
    kubernetes {
      yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: node
      image: node:20-alpine
      command: ["cat"]
      tty: true

    - name: git
      image: alpine/git:2.45.2
      command: ["cat"]
      tty: true

    - name: buildkit
      image: moby/buildkit:rootless
      command: ["cat"]
      tty: true
      env:
        - name: XDG_RUNTIME_DIR
          value: /tmp/xdg
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
      volumeMounts:
        - name: buildkit-cache
          mountPath: /home/user/.local/share/buildkit
        - name: harbor-ca
          mountPath: /etc/certs
          readOnly: true

  volumes:
    - name: buildkit-cache
      emptyDir: {}
    - name: harbor-ca
      secret:
        secretName: harbor-ca
"""
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
    stage("Checkout") {
      steps {
        checkout scm
      }
    }

    stage("Test") {
      steps {
        container("node") {
          sh """
            npm install
            npm test
          """
        }
      }
    }

    stage("Build & Push") {
      steps {
        container("buildkit") {
          withCredentials([usernamePassword(
            credentialsId: "harbor-robot",
            usernameVariable: "HARBOR_USER",
            passwordVariable: "HARBOR_PASS"
          )]) {
            sh """
              set -eux

              SHORT_SHA=$(echo "$GIT_COMMIT" | cut -c1-7)

              mkdir -p "$XDG_RUNTIME_DIR" "$WORKSPACE/.docker"

              AUTH=$(printf "%s:%s" "$HARBOR_USER" "$HARBOR_PASS" | base64 | tr -d "\\n")

              cat > "$WORKSPACE/.docker/config.json" <<EOF
{
  "auths": {
    "harbor.lab.local": {
      "auth": "$AUTH"
    }
  }
}
EOF
              export DOCKER_CONFIG="$WORKSPACE/.docker"

              cat > "$WORKSPACE/buildkitd.toml" <<EOF
debug = true
[registry."harbor.lab.local"]
  ca=["/etc/certs/ca.crt"]
EOF

              buildkitd \\
                --addr unix:///tmp/buildkitd.sock \\
                --config "$WORKSPACE/buildkitd.toml" \\
                --oci-worker-no-process-sandbox \\
                > /tmp/buildkitd.log 2>&1 &

              timeout 30 sh -c "until buildctl --addr unix:///tmp/buildkitd.sock debug workers >/dev/null 2>&1; do sleep 1; done"

              buildctl --addr unix:///tmp/buildkitd.sock build \\
                --frontend dockerfile.v0 \\
                --local context=. \\
                --local dockerfile=. \\
                --output type=image,name=${IMAGE_REPO}:${SHORT_SHA},push=true

              echo "${SHORT_SHA}" > image-tag.txt
            """
          }
        }
      }
    }

    stage("Update GitOps Repo") {
      steps {
        container("git") {
          withCredentials([usernamePassword(
            credentialsId: "gitops-pat",
            usernameVariable: "GIT_USER",
            passwordVariable: "GIT_PASS"
          )]) {
            sh """
              set -eux

              IMAGE_TAG=$(cat image-tag.txt)

              rm -rf gitops
              git clone https://${GIT_USER}:${GIT_PASS}@github.com/2085875766/demo-gitops.git gitops

              cd gitops/charts/myapp
              sed -i "s#tag: .*#tag: ${IMAGE_TAG}#g" values.yaml

              git config user.email "jenkins@lab.local"
              git config user.name "jenkins"

              git add values.yaml
              git commit -m "chore: bump image to ${IMAGE_TAG}" || true
              git push origin ${GITOPS_BRANCH}
            """
          }
        }
      }
    }
  }
}
