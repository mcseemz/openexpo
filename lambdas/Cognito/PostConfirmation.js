/**
 * replicates confirmed user data from cognito to database
 * expected event format:
{
  version: '1',
  region: 'eu-central-1',
  userPoolId: 'eu-central-1_WmDb8dJpb',
  userName: '05839a40-a8a6-4189-aec5-7dcb5e4fa752',
  callerContext: {
    awsSdkVersion: 'aws-sdk-unknown-unknown',
    clientId: '5r70usnvfi23lpl1jkfgjgrc8i'
  },
  triggerSource: 'PostConfirmation_ConfirmSignUp',
  request: {
    userAttributes: {
      sub: '05839a40-a8a6-4189-aec5-7dcb5e4fa752',
      'cognito:email_alias': 'somebody@enter_your.domain',
      'cognito:user_status': 'CONFIRMED',
      email_verified: 'true',
      email: 'somebody@enter_your.domain'
    }
  },
  response: {}
}
*/

const poolUtil = require('./model/pool');
const util = require('./model/util');

const animals = [
    'Alligator', 'Anteater', 'Armadillo', 'Auroch', 'Axolotl', 'Badger', 'Bat', 'Bear', 'Beaver', 'Blobfish',
    'Buffalo', 'Camel', 'Chameleon', 'Cheetah', 'Chipmunk', 'Chinchilla', 'Chupacabra', 'Cormorant', 'Coyote', 'Crow',
    'Dingo', 'Dinosaur', 'Dog', 'Dolphin', 'Dragon', 'Duck', 'Dumbo Octopus', 'Elephant', 'Ferret', 'Fox', 'Frog',
    'Giraffe', 'Goose', 'Gopher', 'Grizzly', 'Hamster', 'Hedgehog', 'Hippo', 'Hyena', 'Jackal', 'Jackalope', 'Ibex',
    'Ifrit', 'Iguana', 'Kangaroo', 'Kiwi', 'Koala', 'Kraken', 'Lemur', 'Leopard', 'Liger', 'Lion', 'Llama', 'Manatee',
    'Mink', 'Monkey', 'Moose', 'Narwhal', 'Nyan Cat', 'Orangutan', 'Otter', 'Panda', 'Penguin', 'Platypus', 'Python',
    'Pumpkin', 'Quagga', 'Quokka', 'Rabbit', 'Raccoon', 'Rhino', 'Sheep', 'Shrew', 'Skunk', 'Slow Loris', 'Squirrel',
    'Tiger', 'Turtle', 'Unicorn', 'Walrus', 'Wolf', 'Wolverine', 'Wombat'
]

exports.handler = async function(event, context, callback) {
    console.log(event, 'lambdaPostConfirmation');
    console.log("EVENT:\n", event);

    let client = util.emptyClient;
    try {
        client = await poolUtil.initPoolClientByUserpool(event.userPoolId, context);

        //check if email exists
        //todo check for aliases. Replace with getPersonFromDB and createUserInDb
        var res = await client.query("SELECT * FROM person WHERE email=$1", [event.request.userAttributes.email.toLowerCase().trim()]);

        //if exists then do nothing
        if (res.rows.length > 0) {
            const query = "UPDATE person set status = 'active' where id = $1 returning *";
            console.log("REQUEST:", query)

            res = await client.query(query, [res.rows[0]['id']]);
            console.log("updated:", res.rows[0]);
        }
        else {
            //else insert into user new cognito id
            const request = "INSERT INTO person (email, name, surname, status) VALUES ( LOWER($1), $2, $3, $4 ) RETURNING *";
            console.log("REQUEST:", request);

            res = await client.query(request, [event.request.userAttributes.email, 'Anonymous', animals[Math.floor(Math.random() * animals.length)], 'incomplete']);
            console.log("inserted:", res.rows[0]);
        }
    }
    catch (err) {
        console.error("error:", err);
    }
    finally {
        console.log("RELEASING");
        if (client) {
           client.release(true);
        }
    }

    callback(null, event);
};
