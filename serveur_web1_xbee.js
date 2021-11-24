
// pour commander le robot
// http://localhost:3000


// port du serveur Web
var port_web = 3000

// à modifier !!!!!!
// dossier contenant les fichiers HTML que le serveur Web pourra envoyer au navigateur
var rep_html = "~/Prog/OCR/TP1-20211110"


var fs = require('fs')
var express = require('express')
var usb = require("./usb.js")
const { setTimeout } = require('timers')

var time = null;

var etat = []; // tableau contenant les états successifs après l'exécution des séquences de commandes
// liste des attributs d'un état :
// ns : numéro de  la séquence de commandes
// exec : bilan de l'exécution, normalement "OK"
// d : distance mesurée
// df : fiabilité de la mesure de distance

var num_seq = 0 // numéro de la séquence de commandes

var mission1 = [
    "[t 0]",                    // init mission
    "[mga 150][mda 150][t 1000]",     // on avance tout droit pendant 1 seconde
    "[t 1000]",                       // on attend 1 seconde pour stabiliser le capteur de distance)
    "[mga 255][mdr 255][t 800]",      // on tourne vers la droite pendant 800 ms
]

var mission2 = [
    "[t 0]",                    // init mission
    "[mga 255][mdr 255][t 200]",      // on tourne vers la droite pendant 200 ms
]

var mission_courante = null

usb.setCallback( function(s) {

    // on attend la réponse de l'Arduino
    // l'Arduino envoie une réponse après l'exécution d'un séquence de commandes
    // quand une réponse arrive, on la mémorise dans etat
    // ensuite on envoie la séquence suivante à l'Arduino

    console.log("usb : "+s)

    // on reçoit la réponse de l'Arduino en JSON
    // exemple d'objet envoyé : {ns: 2, exec : "OK", dist : 43, dist_fiab : 14200}

    var etat_courant = JSON.parse(s)
    console.log("durée séquence n° "+etat_courant.ns+" = "+(Date.now() - time)+ " ms")
    console.log("exec : "+etat_courant.exec)

    etat.push(etat_courant) // on conserve tous les états successifs d'une séquence

 
    if (etat_courant.ns+1 < mission_courante.length) {
        time = Date.now();
        usb.write("[[ns "+(etat_courant.ns+1)+"]"+mission_courante[etat_courant.ns+1]+"]")
    }
    else {
        // lancer la mission suivante en fonction de l'état courant
    }
})

// on attend 3 secondes avant de démarrer la mission (l'Arduino ne répond pas avant 2 secondes)

setTimeout(() => {
    lancer_mission(mission1)
}, 3000);

function lancer_mission(m) {
    mission_courante = m
    time = Date.now();
    etat = []
    usb.write("[[ns 0]"+m[0]+"]")
}
