
// GESTION DES SÉQUENCES DE COMMANDES PAR L'ARDUINO

// les séquences de commandes sont transformées en tableau d'entiers
// après transformation : 2 entiers par commande (numéro de la commande et paramètre)
//
// liste des commandes
// mga : moteur gauche avant
// mgr : moteur gauche arrière
// mda : moteur droit avant
// mdr : moteur droit arrière
// s : servo
// t : temps d'exécution (timeout, arrêt au bout d'un temps t)
// d < : OK si distance inf à
// d > : OK si distance sup à
// df < : OK si fiabilité distance inf à
// df > : OK si fiabilité distance sup à
// nop : non opération (commande vide, sans effet)
// st : stop
// ns : numéro de la séquence de commandes
//
// syntaxe d'une séquence de commandes
// [ pour commencer la séquence
// ] pour terminer la séquence
//
// syntaxe d'une commande
// [ pour commencer la commande
// 1 caractère pour indiquer la commande
// 1 espace (et un seul)
// 1 (et une seule) séquence de chiffres pour le paramètre
// ] pour terminer la commande
//
// exemple
// [[mga 110][mgr 120][mda 130][mdr 140][mst 0][s 160][t 1700][d < 180][d > 190][df < 20000][df > 2100][nop 0]]
// transformé en tableau d'entiers
// 1 110 2 120 3 130 4 140 5 0 6 160 7 1700 8 180 9 190 10 20000 11 1100
//
// exemples de séquences de commandes
// [[mga 150]]
// [[t 3000][mga 150]]
// [[mga 150][mda 150]]
// [[mgr 150][mdr 150]]

// codes des commandes
#define ERREUR 0
#define MOTEUR_G_AVANT 1
#define MOTEUR_G_ARRIERE 2
#define MOTEUR_D_AVANT 3
#define MOTEUR_D_ARRIERE 4
#define MOTEUR_STOP 5
#define SERVO 6
#define TIMEOUT 7
#define DIST_INF 8
#define DIST_SUP 9
#define DIST_FIAB_INF 10
#define DIST_FIAB_SUP 11
#define NOP 12
#define NUM_SEQ 12

#define TIMEOUT 1000	// timeout par défaut

#define BUF_IN 200	// taille max du buffer de lecture
#define LCMD 50		// taille max du tableau de la liste de commandes

char buf_in[BUF_IN];	// buffer de lecture
int buf_in_count = 0;	// taille courante du buffer

int lcmd[LCMD]; // tableau de la liste des commandes à exécuter (2 entiers par commande)
int lcmd_count = 0;	// taille courante du tableau de la liste des commandes
int lcmd_pos = 0;	// position de la commande courante en cours d'exécution

unsigned long time = 0;
unsigned long timeout = 1000;

int num_seq = 0;		// numéro de la dernière séquence de commandes
int exec_en_cours = 0;	// à 1 si exécution en cours

void setup() {
	Serial.begin(9600);
	moteur_init();
	delay(2000);
	Serial.println("OK Arduino");

	for (int i=0 ; i<BUF_IN ; i++) {
		buf_in[i] = 0;
	}

}

int c = -1;		// caractère courant lu
int c_prec = -1;	// caractère précédent lu

void loop() {
	if (Serial.available()) {
		c_prec = c;
		c = Serial.read();
		if ((c == '[') && (c_prec == '[')) {
			// nouvelle lecture d'une séquence de commandes
			for (int i=0 ; i<BUF_IN ; i++) {
				buf_in[i] = 0;
			}
			buf_in[0] = '[';
			buf_in_count = 1;
		}
		else if ((c == ']') && (c_prec == ']')) {
			// fin lecture, nouvelle séquence de commandes reçue
			// Serial.print("lu = "); Serial.println(buf_in);
			decoder_seq_commandes();
			lcmd_pos = 0;	// commande courante
			time = millis();
			timeout = TIMEOUT; // pour arrêter l'exécution d'une séquance on met timeout à 0
			exec_en_cours = 1;
		}
		else if (c == '\n') {
		}
		else {
			buf_in[buf_in_count++] = c;
		}
	}

	if (exec_en_cours == 1) {
		if (time + timeout > millis()) {
			exec_cmd();
		}
		else {
			moteur_stop();
			Serial.print("{\"ns\" : ");
			Serial.print(num_seq);
			Serial.println(", \"exec\" : \"OK\"}");
			exec_en_cours = 0;
		}

	}


}

/*******************************************************************************/
/********************* décodage de la séquence de commandes ********************/
/*******************************************************************************/

void decoder_seq_commandes() {
	// analyse de la séquence de commandes reçue dans buf_in
	// résultat dans lcmd (2 entiers par commande, numéro commande et paramètre)
	
	for (int i=0 ; i<LCMD ; i++) {
		lcmd[i] = ERREUR; // init lcmd à 0
	}
	lcmd_count = 0;

	int pos = 0;
	int p1;
	for (;;) { // décodage d'une commande à chaque itération
		if (pos >= buf_in_count) break;

		if (buf_in[pos] == '[') {
			pos++;
			if ((buf_in[pos] == 'm') && (buf_in[pos+1] == 'g') && (buf_in[pos+2] == 'a')) {
				lcmd[lcmd_count++] = MOTEUR_G_AVANT;
				pos += 3;
			}
			else if ((buf_in[pos] == 'm') && (buf_in[pos+1] == 'g') && (buf_in[pos+2] == 'r')) {
				lcmd[lcmd_count++] = MOTEUR_G_ARRIERE;
				pos += 3;
			}
			else if ((buf_in[pos] == 'm') && (buf_in[pos+1] == 'd') && (buf_in[pos+2] == 'a')) {
				lcmd[lcmd_count++] = MOTEUR_D_AVANT;
				pos += 3;
			}
			else if ((buf_in[pos] == 'm') && (buf_in[pos+1] == 'd') && (buf_in[pos+2] == 'r')) {
				lcmd[lcmd_count++] = MOTEUR_D_ARRIERE;
				pos += 3;
			}
			else if ((buf_in[pos] == 'm') && (buf_in[pos+1] == 's') && (buf_in[pos+2] == 't')) {
				lcmd[lcmd_count++] = MOTEUR_STOP;
				pos += 3;
			}
			else if (buf_in[pos] == 's') {
				lcmd[lcmd_count++] = SERVO;
				pos++;
			}
			else if (buf_in[pos] == 't') {
				lcmd[lcmd_count++] = TIMEOUT;
				pos++;
			}
			else if ((buf_in[pos] == 'd') && (buf_in[pos+1] == ' ') && (buf_in[pos+2] == '<')) {
				lcmd[lcmd_count++] = DIST_INF;
				pos += 3;
			}
			else if ((buf_in[pos] == 'd') && (buf_in[pos+1] == ' ') && (buf_in[pos+2] == '>')) {
				lcmd[lcmd_count++] = DIST_SUP;
				pos += 3;
			}
			else if ((buf_in[pos] == 'd') && (buf_in[pos+1] == 'f') && (buf_in[pos+2] == ' ') && (buf_in[pos+3] == '<')) {
				lcmd[lcmd_count++] = DIST_FIAB_INF;
				pos += 4;
			}
			else if ((buf_in[pos] == 'd') && (buf_in[pos+1] == 'f') && (buf_in[pos+2] == ' ') && (buf_in[pos+3] == '>')) {
				lcmd[lcmd_count++] = DIST_FIAB_SUP;
				pos += 4;
			}
			else if ((buf_in[pos] == 'n') && (buf_in[pos+1] == 'o') && (buf_in[pos+2] == 'p')) {
				lcmd[lcmd_count++] = NOP;
				pos += 3;
			}
			else if ((buf_in[pos] == 'n') && (buf_in[pos+1] == 's')) {
				lcmd[lcmd_count++] = NUM_SEQ;
				pos += 2;
			}
			else {
				lcmd[lcmd_count++] = ERREUR;
				break;
			}

			if (buf_in[pos] != ' ') {
				lcmd[lcmd_count++] = ERREUR;
				break;
			}
			pos++;
			if ((buf_in[pos] < '0') || (buf_in[pos] > '9')) {
				lcmd[lcmd_count++] = ERREUR;
				break;
			}
			p1 = pos; // début du paramètre (entier)
			for (;;) {
				pos++;
				if ((buf_in[pos] < '0') || (buf_in[pos] > '9')) {
					break;
				}
			}
			if (buf_in[pos] == ']') {
				buf_in[pos] = 0;
				lcmd[lcmd_count++] = atoi(buf_in+p1);
				pos++;
			}
			else {
				lcmd[lcmd_count-1] = ERREUR;
				break;
			}
			


		}
		else {
			lcmd[lcmd_count++] = ERREUR;
			break;
		}
	}



	// affichage du tableau des commandes
	// for (int i=0 ; i<lcmd_count ; i+=2) {
	// 	Serial.print("cmd = ");
	// 	Serial.print(lcmd[i]);
	// 	Serial.print(" ");
	// 	Serial.print(lcmd[i+1]);
	// 	Serial.println();
	// }

}

/*******************************************************************/
/********************* exécution d'une commande ********************/
/*******************************************************************/

void exec_cmd() {
	if (lcmd_pos >= lcmd_count) return;

	int cmd = lcmd[lcmd_pos++];
	int param = lcmd[lcmd_pos++];

	// Serial.print("cmd = "); Serial.print(cmd); Serial.print(" param = "); Serial.println(param);

	if (cmd == MOTEUR_G_AVANT) moteur_gauche_avant(param);
	else if (cmd == MOTEUR_D_AVANT) moteur_droite_avant(param);
	else if (cmd == MOTEUR_G_ARRIERE) moteur_gauche_arriere(param);
	else if (cmd == MOTEUR_D_ARRIERE) moteur_droite_arriere(param);
	else if (cmd == MOTEUR_STOP) moteur_stop();
	else if (cmd == TIMEOUT) timeout = param;
	else if (cmd == NUM_SEQ) num_seq = param;


}

/*******************************************************************/
/********************* moteurs - shield DRI0009 ********************/
/*******************************************************************/

//Arduino PWM Speed Control：
int E1 = 5;  
int M1 = 4; 
int E2 = 6;                      
int M2 = 7;                        


void moteur_init() {
	pinMode(M1, OUTPUT);   
	pinMode(M2, OUTPUT); 
}

void moteur_gauche_avant(int speed) {
	digitalWrite(M1,LOW);
	analogWrite(E1, speed);   //PWM Speed Control
}

void moteur_gauche_arriere(int speed) {
	digitalWrite(M1,HIGH);
	analogWrite(E1, speed);   //PWM Speed Control
}

void moteur_droite_avant(int speed) {
 	digitalWrite(M2,LOW);
	analogWrite(E2, speed);   //PWM Speed Control
}

void moteur_droite_arriere(int speed) {
	digitalWrite(M2,HIGH);
	analogWrite(E2, speed);   //PWM Speed Control
}

void moteur_stop() {
	analogWrite(E1, 0);   //PWM Speed Control
	analogWrite(E2, 0);   //PWM Speed Control
}

