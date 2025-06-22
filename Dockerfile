# Imagem oficial do Node
FROM node:20

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos (código + gifs + tudo)
COPY . .

# Expõe a porta para o servidor Express (opcional, mas recomendado)
EXPOSE 3000

# Comando para iniciar o bot
CMD ["node", "altverseahhbot.js"]
# Comando para iniciar o bot com nodemon (opcional, útil para desenvolvimento)
# CMD ["npx", "nodemon", "altverseahhbot.js"]