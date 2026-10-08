pipeline {
    agent any

    environment {
        APP_NAME = "dx-server"
        APP_DIR  = "/var/www/projects/dx/dx_server"
        APP_ENV  = "dev"
        BRANCH   = "develop"
        REPO     = "https://github.com/codewithkathir/dx-server.git"
    }

    options {
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {

        stage('Checkout') {
            steps {
                script {
                    if (fileExists('.git')) {
                        sh 'git reset --hard'
                        sh 'git clean -fd'
                    }
                }

                git branch: "${BRANCH}",
                    url: "${REPO}"
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Type Check') {
            steps {
                sh 'npm run typecheck'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Deploy') {
            steps {
                // .env.<APP_ENV> and uploads/ live only on the VPS in APP_DIR;
                // they are excluded so rsync --delete never removes them.
                sh """
                    sudo mkdir -p ${APP_DIR}
                    sudo chown -R \$(whoami) ${APP_DIR}

                    if [ ! -f ${APP_DIR}/.env.${APP_ENV} ]; then
                        echo "Missing ${APP_DIR}/.env.${APP_ENV} (copy .env.${APP_ENV}.example and fill it in)"
                        exit 1
                    fi

                    rsync -av --delete \
                    --exclude=node_modules \
                    --exclude=.git \
                    --exclude='.env*' \
                    --exclude=uploads \
                    --exclude=coverage \
                    ./ ${APP_DIR}/

                    mkdir -p ${APP_DIR}/uploads

                    cd ${APP_DIR}
                    # Full install: migrations run through tsx (a devDependency)
                    npm ci
                """
            }
        }

        stage('Migrate Database') {
            steps {
                sh """
                    cd ${APP_DIR}
                    npm run migrate:${APP_ENV}
                """
            }
        }

        stage('Restart Application') {
            steps {
                sh """
                    pm2 delete ${APP_NAME} || true

                    cd ${APP_DIR}

                    pm2 start npm \
                    --name ${APP_NAME} \
                    -- run start:${APP_ENV}

                    pm2 save
                """
            }
        }

        stage('Verify') {
            steps {
                sh """
                    sleep 5
                    PORT=\$(grep -E '^PORT=' ${APP_DIR}/.env.${APP_ENV} | cut -d= -f2 | tr -d '[:space:]')
                    curl -fsS http://127.0.0.1:\${PORT:-5001}/api/health
                    pm2 status
                """
            }
        }
    }

    post {
        success {
            echo '✅ DX Server deployed successfully'
        }

        failure {
            echo '❌ Deployment failed'
            sh "pm2 logs ${APP_NAME} --lines 50 --nostream || true"
        }
    }
}
