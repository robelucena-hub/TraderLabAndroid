import json, sys, re
# palavras: [texto, início na fonte (s), fim opcional]
W = [["automação",28.18],["e",28.88],["inteligência",29.04],["artificial.",29.68,30.20],
 ["Olá,",1.50],["pessoal!",1.90,2.36],["Meu",2.40],["nome",2.56],["é",2.72],["Matheus",2.88],["Neris,",3.28,3.58],
 ["sou",3.60],["contador",3.98],["especialista",4.40],["em",4.88],["Creator",4.98],["Economy",5.46,5.88],
 ["e",5.90],["também",5.98],["cofundador",6.40],["da",6.96],["CACS",7.14],["Contabilidade,",7.66,8.50],
 ["uma",8.72],["empresa",8.88],["focada",9.28],["em",9.68],["afronegócios.",9.84,10.62],
 ["E,",10.80],["nesse",10.96],["momento,",11.12,11.34],["eu",11.36],["vou",11.52],["te",11.68],["fazer",11.76],["um",12.00],["convite",12.08,12.62],
 ["a",12.80],["participar",13.12],["comigo",13.84],["da",14.32],["primeira",14.56],
 ["Imersão",14.96],["Tecnológica",15.60],["Contábil,",16.48,17.02],["o",17.12],["primeiro",17.20],["ITCONT,",17.52,18.50],
 ["que",18.64],["acontecerá",18.88],["entre",19.52],["os",19.76],["dias",19.84],
 ["21",20.24],["e",20.64],["22",20.88],["de",21.28],["outubro,",21.44],["na",21.84],["UEFS,",22.00,22.70],
 ["onde",22.88],["a",23.12],["gente",23.20],["vai",23.36],["bater",23.60],["um",24.00],["papo,",24.16,24.50],
 ["aprender",24.56],["um",24.96],["pouco",25.04],["mais",25.28],["sobre",25.52],
 ["rotinas,",25.84],["processos",26.64,27.30],["e,",27.40],["principalmente,",27.60],
 ["automação",28.18],["e",28.88],["inteligência",29.04],["artificial.",29.68,30.20],
 ["Como",30.56],["isso",30.72],["vem",30.96],["impactando",31.12],["na",31.92],["minha",32.16],["vida,",32.40],["no",32.72],["meu",32.88],["negócio",33.16],
 ["e",33.56],["na",33.72],["contabilidade.",33.96,34.76],["Espero",35.00],["por",35.40],["você!",35.64,36.12]]
# H = oculta na tela (o texto da fala aparece como tipografia cinética ou tarja no mesmo lugar); o .srt traz todas
CAPS = [("H","automação e inteligência artificial.",True,"H"),
 ("A","Olá, pessoal!"),("A","Meu nome é Matheus Neris,",False,"H"),("A","sou contador especialista",False,"H"),("A","em Creator Economy",False,"H"),
 ("A","e também cofundador"),("A","da CACS Contabilidade,"),("A","uma empresa focada em afronegócios.",False,"H"),
 ("A","E, nesse momento,"),("A","eu vou te fazer um convite",False,"H"),("A","a participar comigo da primeira"),
 ("A","Imersão Tecnológica Contábil,",False,"H"),("A","o primeiro ITCONT,",False,"H"),("A","que acontecerá entre os dias"),
 ("A","21 e 22 de outubro, na UEFS,"),("A","onde a gente vai bater um papo,"),("A","aprender um pouco mais sobre",False,"H"),
 ("A","rotinas, processos",False,"H"),("A","e, principalmente,"),("A","automação e inteligência artificial.",False,"H"),
 ("A","Como isso vem impactando",False,"H"),("A","na minha vida, no meu negócio",False,"H"),("A","e na contabilidade.",False,"H"),("A","Espero por você!",False,"H")]
norm = lambda s: re.sub(r"[^\w]", "", s.lower())
captions, i = [], 0
for c in CAPS:
    seg, text = c[0], c[1]; toks = text.split(); i0 = i
    for t in toks:
        assert norm(W[i][0]) == norm(t), (W[i][0], t, text); i += 1
    d = {"seg": seg, "text": text, "w": [i0, i - 1]}
    if len(c) > 2 and c[2]: d["start_at_segment"] = True
    if len(c) > 3 and c[3] == "H": d["hide"] = True
    captions.append(d)
assert i == len(W), (i, len(W))
E = {
 "_doc": "Projeto editável — vídeo do Matheus Neris para o ITCONT. Tempos de origem em segundos do arquivo original (30 fps). Edite e rode run_all.sh.",
 "fps": 30, "ext": 40, "watermark_top": 1920, "srt_name": "legendas_MatheusNeris_ITCONT.srt",
 "show_unspoken_info": True,
 "_show_unspoken_info": "Horário (19h às 21h30), Auditório III e Módulo IV não são falados por ele (vêm do planejamento do evento). false = encerramento só com datas e UEFS.",
 "caption_y": 1428,
 "event": {"name": "ITCONT", "full_name": "Imersão Tecnológica Contábil", "institution": "UEFS",
           "session_date": "21 e 22 de outubro de 2026", "session_time": "19h às 21h30",
           "venue_1": "Auditório III", "venue_2": "Módulo IV",
           "organizer": "Projeto de Extensão Contador do Amanhã", "cta": "Participe do ITCONT. Esperamos você!"},
 "presenter": {"name": "Matheus Neris", "role": "Contador · Creator Economy"},
 "segments": [
   {"id": "H", "hook": True, "label": "Gancho: 'automação e inteligência artificial'", "in": 845, "out": 907},
   {"id": "A", "label": "Fala completa, sem cortes internos (pausas de no máximo 0,2 s)", "in": 42, "out": 1095}],
 "closing_frames": 160,
 "words": W, "captions": captions,
 "highlight": ["Matheus Neris", "Creator Economy", "afronegócios", "convite", "Imersão Tecnológica Contábil", "ITCONT",
               "21 e 22 de outubro", "UEFS", "automação", "inteligência artificial"],
 "cues_seg": {"hook_in": "H"},
 "cues_src": {"hook_in": 28.17,
   "lt_in": 2.34, "lt_role": 3.98, "lt_out": 5.62,
   "afro_in": 8.66, "afro_word": 9.84, "afro_out": 10.52,
   "conv_in": 11.30, "conv_word": 12.08, "conv_out": 12.52,
   "logo_in": 14.90, "ed_in": 17.20, "logo_out": 18.36,
   "date_in": 19.40, "date_21": 20.24, "date_22": 20.88, "date_month": 21.44, "loc_in": 21.70, "loc_uefs": 22.00, "cards_out": 24.40,
   "rot_blk": 24.50, "rot_kick_end": 25.50, "rot_in": 25.84, "proc_in": 26.64, "rot_out": 27.12,
   "auto_in": 28.18, "ia_in": 29.04, "auto_out": 30.28,
   "imp_in": 30.50, "imp_kick_end": 31.85, "imp_vida": 32.40, "imp_neg": 33.16, "imp_cont": 33.96, "imp_out": 34.74,
   "final_in": 34.96, "final_word": 35.64,
   "closing_wipe": 36.16, "music_drop": 12.08},
 "_camera": "Corpo em 1,00x fixo: qualquer zoom desceria a barba sobre a faixa de textos (o rosto ocupa ~1060 px dos 1920).",
 "camera_src": [["H","start",1.0,0,"cut"],["H","end",1.025,30,"lin"],
   ["A","start",1.0,0,"cut"],["A","end",1.0,0,"lin"]],
 "sfx": [["whoosh","seg_H_t0",0.5,0.02],["hit","seg_H_t0",0.3],["whoosh","seg_H_t1",0.85,-0.18],
   ["pop","lt_in",0.7],["tick","lt_role",0.5],
   ["tick","afro_in",0.3],["pop","afro_word",0.5],["tick","imp_in",0.3],
   ["tick","conv_in",0.3],["pop","conv_word",0.55],
   ["impact","logo_in",0.42,-0.04],["tick","ed_in",0.45],["whoosh","logo_out",0.35],
   ["pop","date_21",0.5],["tick","date_22",0.4],["tick","date_month",0.35],["pop","loc_uefs",0.5],["whoosh","cards_out",0.4],
   ["tick","rot_blk",0.3],["tick","rot_in",0.35],["tick","proc_in",0.35],
   ["tick","auto_in",0.4],["tick","ia_in",0.4],
   ["pop","imp_vida",0.4],["pop","imp_neg",0.4],["pop","imp_cont",0.45],
   ["pop","final_in",0.45],
   ["whoosh","closing_wipe",0.55,0.12],["impact","closing_wipe",0.55,0.66]]}
json.dump(E, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
print("ok", len(W), "palavras", len(captions), "legendas")
