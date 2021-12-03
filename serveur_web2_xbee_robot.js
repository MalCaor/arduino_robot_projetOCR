
// pour commander le robot
// http://localhost:3000

// exemple pour faire avancer et recu

var toupiecompt = 0
var reculecompte = 0
var tourne=0
var suivreCoteGauche = false// suis le mur a gauche du robot
var suivreCoteDroit = true // suis le mur a droite du robot

// port du serveur Web
var port_web = 3000

// à modifier !!!!!!
// dossier contenant les fichiers HTML que le serveur Web pourra envoyer au navigateur
//var rep_html = "/home/malcaor/Prog/OCR/site/index.html"
var rep_html = "C:\Users\msi\Documents\L3 Confinement\OCR\arduino_robot_projetOCR"


var fs = require('fs')
var express = require('express')
var usb = require("./usb.js")
const { setTimeout } = require('timers')
const { Console } = require('console')

var time = null;

var mission = null;  // fonction qui gère la mission courante
var cmd_num = null;    // numéro de la séquance courante à exécuter
var etat = null;    // dernière réponse de l'Arduino

var chunk = ""; // on reçoit la réponse de l'Arduino par morceaux

var grandEspace = false; //true si le robot évolue dans un environnement vaste, false si c'est un 9m²

usb.setCallback( function(s) {

    // on attend la réponse de l'Arduino
    // l'Arduino envoie une réponse après l'exécution d'un séquence de commandes
    // quand une réponse arrive, on la mémorise dans etat
    // ensuite on envoie la séquence suivante à l'Arduino


    chunk += s;

    if (chunk.indexOf("\n")) { // si on a reçu toute la ligne de réponse

        //console.log("usb : "+chunk)

        // on reçoit la réponse de l'Arduino en JSON
        // exemple d'objet envoyé : {ns: 2, exec : "OK", dist : 43, dist_fiab : 14200}
    
        if (chunk.startsWith("{")) { // on a une réponse JSON
            etat = JSON.parse(chunk)

            //-----------------AFFICHAGE----------------------
            /*
            console.log("durée séquence n° "+etat.ns+" = "+(Date.now() - time)+ " ms")
            console.log("exec : "+etat.exec)
            for (let index = 0; index < 15; index+=3) {
                console.log("angle : " + etat.dist[index])
                console.log("dist : " + etat.dist[index+1])
            }*/
            //-------------------------------------------------

            if(etat.dist[7] <= 130){
                console.log("----------Recule")
                mission = recule
            }else if(etat.dist[1] < 500 && etat.dist[4] < 450 && etat.dist[7] < 500 && suivreCoteDroit){
                // \
                //  \ 
                // O \
                console.log("----------Penché droit")
                mission = gauche
            }else if(etat.dist[7] < 500 && etat.dist[10] < 450 && etat.dist[13] < 500 && suivreCoteGauche){
                //   /
                //  / 
                // / O  
                console.log("----------Penché gauche")
                mission = droite
            } else if(etat.dist[1] < 700 && etat.dist[4] < 600 && etat.dist[7] < 700 && grandEspace && suivreCoteDroit){//-----------------------------LOIN---------------------------
                // \
                //  \ 
                // O \
                console.log("----------Penché droit loin")
                mission = gauche_leger
            }else if(etat.dist[7] < 700 && etat.dist[10] < 600 && etat.dist[13] < 700 && grandEspace && suivreCoteGauche){//-----------------------------LOIN---------------------------
                //   /
                //  / 
                // / O  
                console.log("----------Penché gauche loin")
                mission = droite_leger
            } else if(etat.dist[1] < 500 && suivreCoteDroit){
                //   |
                // O |
                //   |
                console.log("----------Coté droit")
                mission = avance
            } else if(etat.dist[13] < 500 && suivreCoteGauche){
                // | 
                // | O
                // |  
                console.log("----------Coté gauche")
                mission = avance
            } else if(etat.dist[1] < 700 && grandEspace && suivreCoteDroit){//-----------------------------LOIN---------------------------
                //   |
                // O |
                //   |
                console.log("----------Coté droit loin")
                mission = avance
            } else if(etat.dist[13] < 700 && grandEspace && suivreCoteGauche){//-----------------------------LOIN---------------------------
                // | 
                // | O
                // |  
                console.log("----------Coté gauche loin")
                mission = avance
            } else if(etat.dist[4] < 500 && etat.dist[7] < 450 && etat.dist[10] < 500){
                // _____
                //   O
                //  
                console.log("----------Face")
                if(etat.dist[1] <= etat.dist[13])
                {
                    mission = gauche
                }else{
                    mission = droite
                }
            }else {
                console.log("----------Toupie/Avance")
                //mission = toupie
                mission = toupie
            }
            console.log("Effectue Mission")
            if (mission != null) mission(); // chaque fois qu'on reçoit une réponse de l'Arduino, on relance la mission
            
        }

        chunk = ""
         
    }
     // note : il faudrait prévoir le cas où l'Arduino ne répond plus
    voir_autour_soit()
})


////////////////////////////// mission avancer_mur /////////////////////////////////////

var cmd_avancer_mur = [
    "[t 0]",                    // init mission
    "[mga 150][mda 150][t 1000]",     // on avance pendant 1 seconde
    "[t 1000]",                       // on attend l'arrêt du robot
]

function avancer_mur() {

    // test d'arrêt
    if (cmd_num > cmd_avancer_mur.length*3) { // on exécute au plus 3 fois la séquence
        mission = null
        console.log("mission avancer_mur terminée")
        return
    }

    time = Date.now();
    console.log("exec "+cmd_avancer_mur[cmd_num%cmd_avancer_mur.length])
    usb.write("[[ns " + cmd_num + "]"+cmd_avancer_mur[cmd_num%cmd_avancer_mur.length]+"]")
    cmd_num++;

}

////////////////////////////// mission aligner /////////////////////////////////////

var cmd_aligner = [
    "[t 0]",                    // init mission
    "[mga 150][mda 150][t 1000]",     // on avance pendant 1 seconde
    "[t 1000]",                       // on attend l'arrêt du robot
    "[mgr 150][mdr 150][t 1000]",      // on recule pendant 1 seconde
    "[t 1000]",                       // on attend l'arrêt du robot
]

function aligner() {

    // test d'arrêt
    if (cmd_num > cmd_aligner.length*2) {
        mission = null
        console.log("mission aligner terminée")
        return
    }

    time = Date.now(); // pour mesurer le temps d'exécution d'une séquence
    console.log("exec "+cmd_aligner[cmd_num%cmd_aligner.length])
    usb.write("[[ns 0]"+cmd_avancer_reculer[cmd_num%cmd_aligner.length]+"]")
    cmd_num++

}

///////////////////////////////// lancement d'une mission //////////////////////////

// on attend 5 secondes avant de démarrer la mission (l'Arduino ne répond pas avant 2 secondes)

setTimeout(() => {
    mission = voir_autour_soit // on va exécuter la fonction avancer_mur
    //mission = aligner; // on va exécuter la fonction aligner
    cmd_num = 0    // numéro de la séquence courante
    mission()
    //mission = null
}, 5000);

////////////////////////////////// custom mission /////////////////////////////////
function voir_autour_soit() {
    time = Date.now();
    num = 0
    usb.write("[[bl 0]]")
    //mission = null
    console.log("mission voir_autour_soit terminée")
    return
}

function avance(){
    time = Date.now();
    num = 0
    usb.write("[[mga 170][mda 170][t 1000]]")
    //mission = null
    console.log("mission avance terminée")
}

function gauche(){
    if(tourne>0){
        tourne=0
        usb.write("[[mda 150][mga 150]]")
        gauche()
    }else{
        tourne++
        time = Date.now();
        num = 0
        usb.write("[[mda 170][mga 150]")
        //mission = null
        console.log("mission gauche terminée")
    }
    
}

function droite(){
    if(tourne>0){
        tourne=0
        usb.write("[[mda 150][mga 150]]")
        droite()
    }else{
        tourne++
        time = Date.now();
        num = 0
        usb.write("[[mda 150][mga 170]]")
        //mission = null
        console.log("mission droite terminée")
    }

}

function gauche2(){
    time = Date.now();
    num = 0
    usb.write("[[mda 150]]")
    //mission = null
    console.log("mission gauche terminée")
}

function droite2(){
    time = Date.now();
    num = 0
    usb.write("[[mga 250]]")
    //mission = null
    console.log("mission droite terminée")
}

function toupie(){
    if(reculecompte==0){
        if(toupiecompt>0) {
            toupiecompt = 0
            avance()
        } else{
            toupiecompt = toupiecompt +1
            time = Date.now();
            num = 0
            usb.write("[[mga 150]]")
            //mission = null
            console.log("mission Toupie terminée")
        }
    }
}

function recule(){
        if(reculecompte>0){
            reculecompte=0
            //voir_autour_soit()
            avance()
        }else{
            time = Date.now();
            num = 0
            usb.write("[[mga 250][mdr 250]]")
            //droite2()
            //mission = null
            console.log("mission recule terminée")
            reculecompte++
        }
    
    
}

function gauche_leger(){
    time = Date.now();
    num = 0
    usb.write("[[mda 200][mga 150]]")
    //avance()
    //gauche()
    //mission = null
    console.log("mission gauche terminée")

}


function droite_leger(){
    time = Date.now();
    num = 0
    usb.write("[[mga 200][mda 150]]")
    //avance()
    //droite()
    //mission = null
    console.log("mission droite_leger terminée")

}