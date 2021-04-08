var functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Adds a message that welcomes new users into the chat.

exports.sendNotificationOnOrdersCreate = functions.database.ref('/orders/{orderId}')
    .onCreate(async (change, context) => {

        const uid = change.child('uid').val();
        const displayName = change.child('displayName').val();
        const photoURL = change.child('photoURL').val();
        const cartPrice = parseInt(change.child('cartPrice').val());

        let total = 0;

        const totalSnapshot = await admin.database().ref('/orders').orderByChild('uid').equalTo(uid).once('value');
        totalSnapshot.forEach((orderSnapshot) => {
            total += parseInt(orderSnapshot.val().cartPrice);
        });

        console.log("Total: " + total);

        admin.database().ref("/users").child(uid).update({
            totalAmount: total,
        });

        let tokenIds = new Array();
        const usersSnapshot = await admin.database().ref('/users').child(uid).once('value');
        tokenIds.push(usersSnapshot.val().tokenId);

        // const adminUserSnapShot = await admin.database().ref('/users').once('value');
        // adminUserSnapShot.forEach((userSnapshot) => {
        //     if (userSnapshot.val().isAdmin) {
        //         tokenIds.push(userSnapshot.val().tokenId);
        //     }
        // })

        const payload = {
            notification: {
                title: displayName.toString(),
                body: "Order Placed for ₹" + cartPrice.toString(),
                image: photoURL.toString(),
            },
        };

        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24,
        };

        return admin.messaging().sendToDevice(tokenIds, payload, options);

    });


exports.sendNotificationOnOrdersUpdate = functions.database.ref('/orders/{orderId}')
    .onUpdate(async (change, context) => {

        const uid = change.before.child('uid').val();
        const uidAfter = change.after.child('uid').val();
        const displayName = change.before.child('displayName').val();
        const photoURL = change.before.child('photoURL').val();
        const cartPrice = change.before.child('cartPrice').val();

        const shipped = change.after.child('shipped').val();
        const paymentCleared = change.after.child('paymentCleared').val();

        let body = "Order Updated !!!";

        let tokenIds = new Array();
        const usersSnapshot = await admin.database().ref('/users').child(uid).once('value');
        tokenIds.push(usersSnapshot.val().tokenId);

        // const adminUserSnapShot = await admin.database().ref('/users').once('value');
        // adminUserSnapShot.forEach((userSnapshot) => {
        //     if (userSnapshot.val().isAdmin) {
        //         tokenIds.push(userSnapshot.val().tokenId);
        //     }
        // })

        if (shipped) {
            body = "Delivered Order Placed for ₹" + cartPrice.toString();
        } else if (paymentCleared) {
            body = "Paid ₹" + cartPrice.toString() + " for the Order. Thanks You !!";
        } else if (uidAfter === null) {
            body = "Sorry...!!! Order for ₹" + cartPrice.toString() + " is deleted by the Admin";
        }


        const payload = {
            notification: {
                title: displayName.toString(),
                body: body,
                image: photoURL.toString(),
            },
        };

        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24,
        };

        return admin.messaging().sendToDevice(tokenIds, payload, options);

    });

exports.updateUserProfileDetailsInDatabase = functions.auth.user()
    .onCreate(user => {

        const displayName = user.displayName;
        const email = user.email;
        const uid = user.uid;
        const photoURL = user.photoURL;

        admin.database().ref('/users').child(uid).update(
            {
                displayName: displayName,
                email: email,
                uid: uid,
                photoURL: photoURL,
            }
        );

    });

exports.updateUserMonthlySalesInUserNode = functions.database.ref('/orders/{orderId}')
    .onCreate(async (change, context) => {

        const uid = change.child('uid').val();
        const date = new Date(parseInt(change.child('orderPlacedOn').val()));
        const year = date.getFullYear();

        const ordersSnapshot = await admin.database().ref('/orders').orderByChild('uid').equalTo(uid).once('value');

        let array = new Array(12).fill(0);

        ordersSnapshot.forEach((order) => {
            orderPlacedOn = order.val().orderPlacedOn;
            cartPrice = order.val().cartPrice;

            if (new Date(parseInt(orderPlacedOn)).getMonth() === 0) {
                array[0] = array[0] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 1) {
                array[1] = array[1] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 2) {
                array[2] = array[2] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 3) {
                array[3] = array[3] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 4) {
                array[4] = array[4] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 5) {
                array[5] = array[5] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 6) {
                array[6] = array[6] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 7) {
                array[7] = array[7] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 8) {
                array[8] = array[8] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 9) {
                array[9] = array[9] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 10) {
                array[10] = array[10] + cartPrice;
            } else if (new Date(parseInt(orderPlacedOn)).getMonth() === 11) {
                array[11] = array[11] + cartPrice;
            }
        });

        admin.database().ref('/users').child(uid).child(year)
            .update(
                {
                    jan: array[0],
                    feb: array[1],
                    mar: array[2],
                    apr: array[3],
                    may: array[4],
                    jun: array[5],
                    jul: array[6],
                    aug: array[7],
                    sep: array[8],
                    oct: array[9],
                    nov: array[10],
                    dec: array[11],
                }
            );
    });

exports.updateStockAtProductsNode = functions.database.ref('/orders/{orderId}')
    .onUpdate(async (change, context) => {

        const shipped = change.after.child('shipped').val();
        const orderId = change.before.child('orderId').val();

        if (shipped) {

            const oSnapshot = await admin.database().ref('/orders').child(orderId).child('cart').once('value');
            oSnapshot.forEach(async (cartLineSnapShot) => {

                const productId = cartLineSnapShot.val().product.id;
                const quantity = parseInt(cartLineSnapShot.val().quantity);

                const pSnapShot = await admin.database().ref('/products').child(productId).once('value');
                const stock = pSnapShot.val().stock - quantity;

                console.log(cartLineSnapShot.val().product.name + " Stock after Shipping: " + stock);

                admin.database().ref('/products').child(productId).update(
                    {
                        stock: stock,
                    }
                );

            });

        }
    });

exports.updateSalesPerYearAtProductsNode = functions.database.ref('/orders/{orderId}')
    .onUpdate((change, context) => {

        const shipped = change.after.child('shipped').val();
        const orderId = change.after.child('orderId').val();
        const orderPlacedOn = change.after.child('orderPlacedOn').val();

        const date = new Date(parseInt(orderPlacedOn));
        const year = date.getFullYear();

        if (shipped) {

            admin.database().ref('/orders').child(orderId).child('cart').once('value', (cartSnapshot) => {

                cartSnapshot.forEach((cartLineSnapshot) => {
                    const productId = cartLineSnapshot.val().product.id;
                    const quantity = cartLineSnapshot.val().quantity;

                    admin.database().ref('/products').child(productId).child(year).once('value', (saleSnapshot) => {
                        let array = new Array(12).fill(0);

                        if (saleSnapshot.val() !== null) {
                            if (date.getMonth() === 0) {
                                array[0] = saleSnapshot.val().jan + quantity;
                            } else if (date.getMonth() === 1) {
                                array[1] = saleSnapshot.val().feb + quantity;
                            } else if (date.getMonth() === 2) {
                                array[2] = saleSnapshot.val().mar + quantity;
                            } else if (date.getMonth() === 3) {
                                array[3] = saleSnapshot.val().apr + quantity;
                            } else if (date.getMonth() === 4) {
                                array[4] = saleSnapshot.val().may + quantity;
                            } else if (date.getMonth() === 5) {
                                array[5] = saleSnapshot.val().jun + quantity;
                            } else if (date.getMonth() === 6) {
                                array[6] = saleSnapshot.val().jul + quantity;
                            } else if (date.getMonth() === 7) {
                                array[7] = saleSnapshot.val().aug + quantity;
                            } else if (date.getMonth() === 8) {
                                array[8] = saleSnapshot.val().sep + quantity;
                            } else if (date.getMonth() === 9) {
                                array[9] = saleSnapshot.val().oct + quantity;
                            } else if (date.getMonth() === 10) {
                                array[10] = saleSnapshot.val().nov + quantity;
                            } else if (date.getMonth() === 11) {
                                array[11] = saleSnapshot.val().dec + quantity;
                            }
                        } else {
                            if (date.getMonth() === 0) {
                                array[0] = quantity;
                            } else if (date.getMonth() === 1) {
                                array[1] = quantity;
                            } else if (date.getMonth() === 2) {
                                array[2] = quantity;
                            } else if (date.getMonth() === 3) {
                                array[3] = quantity;
                            } else if (date.getMonth() === 4) {
                                array[4] = quantity;
                            } else if (date.getMonth() === 5) {
                                array[5] = quantity;
                            } else if (date.getMonth() === 6) {
                                array[6] = quantity;
                            } else if (date.getMonth() === 7) {
                                array[7] = quantity;
                            } else if (date.getMonth() === 8) {
                                array[8] = quantity;
                            } else if (date.getMonth() === 9) {
                                array[9] = quantity;
                            } else if (date.getMonth() === 10) {
                                array[10] = quantity;
                            } else if (date.getMonth() === 11) {
                                array[11] = quantity;
                            }
                        }

                        admin.database().ref('/products').child(productId).child(year)
                            .update(
                                {
                                    jan: array[0],
                                    feb: array[1],
                                    mar: array[2],
                                    apr: array[3],
                                    may: array[4],
                                    jun: array[5],
                                    jul: array[6],
                                    aug: array[7],
                                    sep: array[8],
                                    oct: array[9],
                                    nov: array[10],
                                    dec: array[11],
                                }
                            );
                    });
                });
            });
        }
    });