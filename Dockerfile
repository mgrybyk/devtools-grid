FROM node:14

ENV PORT="8230"

WORKDIR /app
COPY . ./

RUN npm run build
EXPOSE 8230
CMD ["npm", "start"]
