
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    environment {
        APP_NAME = 'dx-server-qa'
        APP_ENV = 'qa'
        APP_PORT = '7004'
        APP_DIR = '/var/www/projects/dx/dx-server-qa'
        DEPLOY_HELPER = '/usr/local/sbin/dx-deploy-server-qa'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
                sh 'git log -1 --oneline'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint and Typecheck') {
            steps {
                sh '''
                    npm run lint
                    npm run typecheck
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                    set -eu
                    npm run build
                    test -f dist/server.js
                '''
            }
        }

        stage('Prepare Production Dependencies') {
            steps {
                sh 'npm ci --omit=dev'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -eu
                    sudo -n "$DEPLOY_HELPER"
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -eu

                    for i in $(seq 1 15); do
                        if curl -fsS \
                            "http://127.0.0.1:${APP_PORT}/api/health"; then
                            echo
                            echo "QA backend health check passed."
                            exit 0
                        fi
                        sleep 2
                    done

                    echo "QA backend health check failed."
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'DX Server QA deployment completed successfully.'
        }
        failure {
            echo 'DX Server QA pipeline failed. Check the stage logs.'
        }
        always {
            echo 'DX Server QA pipeline finished.'
        }
    }
}
