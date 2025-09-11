

Dockerfile
FROM node:18

# Instala Haraka globalmente
RUN npm install -g Haraka

# Cria diretório de trabalho
WORKDIR /app

# Inicializa Haraka
RUN haraka -i.

# Configura porta SMTP
RUN echo "port=587\nlisten=0.0.0.0"> config/smtp.ini

# Ativa autenticação via arquivo
RUN echo "auth/flat_file"> config/plugins

# Cria credenciais SMTP com usuário simples
RUN echo "norelp:senhaforte123"> config/auth_flat_file.ini

# Expõe a porta SMTP
EXPOSE 587

# Inicia o servidor
CMD ["haraka", "-c", "."]
