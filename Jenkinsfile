
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        APP_NAME      = 'dx-server'
        APP_ENV       = 'dev'
        APP_PORT      = '7002'
        ENV_FILE      = '/var/www/projects/dx/dx-server/.env.dev'
        DEPLOY_HELPER = '/usr/local/sbin/dx-deploy-server-dev'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Type Check') {
            steps {
                sh 'npm run typecheck'
            }
        }

        stage('Build') {
            steps {
                sh '''
                    set -eu
                    test -f "$ENV_FILE" || {
                        echo "ERROR: Dev environment file is missing"
                        exit 1
                    }
                    npm run build
                    test -f dist/server.js || {
                        echo "ERROR: dist/server.js was not generated"
                        exit 1
                    }
                    echo "Backend build completed"
                '''
            }
        }

        stage('Prepare Production Dependencies') {
            steps {
                sh '''
                    set -eu
                    npm ci --omit=dev
                    test -d node_modules
                    test -f dist/server.js
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -eu
                    test -f "$DEPLOY_HELPER"
                    sudo -n "$DEPLOY_HELPER"
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -eu
                    for attempt in $(seq 1 15); do
                        if curl --fail --silent \
                            "http://127.0.0.1:${APP_PORT}/api/health" \
                            -o /dev/null; then
                            echo "Backend health check passed"
                            exit 0
                        fi
                        echo "Waiting for backend (attempt ${attempt}/15)"
                        sleep 2
                    done
                    echo "ERROR: Backend health check failed"
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'DX Server Dev deployment completed successfully.'
        }
        failure {
            echo 'DX Server Dev pipeline failed. Check the stage logs.'
        }
    }
}
