FROM mhart/alpine-node:8.5

RUN mkdir -p /usr/src/app
ADD . /usr/src/app
WORKDIR /usr/src/app
RUN npm i

CMD npm start
