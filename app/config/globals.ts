import convict from 'convict';

type GlobalsConfig = {
    env: string,
    server: {
        port: number,
        baseUrl: string,
    },
    client: {
        baseUrl: string,
    },
    database: {
        postgres: {
            host: string,
            port: number,
            user: string,
            password: string,
            database: string,
        },
    },
    auth: {
        magicLink: {
            secret: string,
        },
        jwt: {
            accessTokenSecret: string,
            refreshTokenSecret: string,
        },
    },
    api: {
        postmark: {
            token: string,
            fromEmail: string,
        },
    },
    storage: {
        s3: {
            accessKey: string,
            secretKey: string,
            bucketName: string,
        },
    },
};

const schema = {
    env: {
        doc: 'The application environment.',
        format: [
            'production',
            'development',
            'stage',
            'test',
        ],
        default: 'development',
        env: 'NODE_ENV',
    },
    server: {
        port: {
            doc: 'The port to bind.',
            format: 'port',
            default: 3000,
            env: 'PORT',
        },
        baseUrl: {
            doc: 'Backend server base url',
            format: String,
            default: 'https://api.stagistic.com',
            env: 'SERVER_BASE_URL',
        },
    },
    client: {
        baseUrl: {
            doc: 'The client base url.',
            format: String,
            default: 'https://stagistic.com',
            env: 'CLIENT_BASE_URL',
        },
    },
    database: {
        postgres: {
            host: {
                doc: 'Postgres host',
                format: String,
                default: '127.0.0.1',
                env: 'POSTGRES_HOST',
            },
            port: {
                doc: 'Postgres port',
                format: 'port',
                default: 5432,
                env: 'POSTGRES_PORT',
            },
            user: {
                doc: 'Postgres user name',
                format: String,
                default: 'idefix',
                env: 'POSTGRES_USER',
            },
            password: {
                doc: 'Postgres user password',
                format: String,
                default: 'idefix',
                env: 'POSTGRES_PASSWORD',
            },
            database: {
                doc: 'Postgres database name',
                format: String,
                default: 'idefix',
                env: 'POSTGRES_DB',
            },
        },
    },
    auth: {
        magicLink: {
            secret: {
                doc: 'The magic link secret.',
                format: String,
                default: 'jalapeno',
                env: 'AUTH_MAGIC_LINK_SECRET',
            },
        },
        jwt: {
            accessTokenSecret: {
                doc: 'JWT access token secret',
                format: String,
                default: 'jalapeno',
                env: 'JWT_ACCESS_TOKEN_SECRET',
            },
            refreshTokenSecret: {
                doc: 'JWT refresh token secret',
                format: String,
                default: 'chipotle',
                env: 'JWT_REFRESH_TOKEN_SECRET',
            },
        },
    },
    api: {
        postmark: {
            token: {
                doc: 'Postmark API key',
                format: String,
                default: '',
                env: 'POSTMARK_API_KEY',
            },
            fromEmail: {
                doc: 'From email address',
                format: String,
                default: 'hello@stagistic.com',
                env: 'POSTMARK_FROM_EMAIL',
            },
        },
    },
    storage: {
        s3: {
            accessKey: {
                doc: 'S3 storage access key',
                format: String,
                default: '',
                env: 'AWS_ACCESS_KEY_ID',
            },
            secretKey: {
                doc: 'S3 storage secret key',
                format: String,
                default: '',
                env: 'AWS_SECRET_ACCESS_KEY',
            },
            bucketName: {
                doc: 'S3 bucket for temporary files',
                format: String,
                default: 'lego-idefix-temp-storage-dev',
                env: 'AWS_S3_BUCKET_TEMP_STORAGE',
            },
        },
    },
};

const config = convict<GlobalsConfig>(schema);

config.validate({allowed: 'strict'});

export default config;
