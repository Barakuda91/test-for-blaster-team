#test for Blaster team

#### first configure the configuration file
    config/config.json
#### install dependence
    npm i
#### install mochs globaly
    npm i -g mocha
#### run test
    npm test
#### you can control the input arguments
    mocha test/DB.test.js --drop --userId=1 --dialogsLimit=10 --dialogsOffset=0 --messageLimit=10
    


