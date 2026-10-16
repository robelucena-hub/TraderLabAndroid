import json, sys
# palavras: [texto, início, (fim)] em segundos do arquivo original; inícios conferidos no espectrograma
W = [["Inteligência",11.47],["artificial",12.08],["e",12.64],["inovação",12.80,13.38],["como",13.46],["estratégia",13.62],["empresarial",14.16,14.75],
 ["Olá,",0.35,0.74],["eu",0.95],["sou",1.00],["Angelo",1.18],["Loula,",1.62,1.93],
 ["professor",2.48],["da",2.72],["UEFS,",2.88,3.12],
 ["pesquisador",3.33],["de",3.86],["inteligência",3.95],["artificial",4.42,4.87],
 ["e",5.35],["coordeno",5.48],["o",6.15],["programa",6.27],["de",6.52],["aceleração",6.64],["de",7.20],["startups.",7.36,7.78],
 ["Trabalho",8.43],["na",8.72],["Agência",8.88],["de",9.20],["Inovação",9.36,9.85],
 ["e",9.91],["vou",10.00],["falar",10.16],["com",10.40],["vocês",10.56,10.92],
 ["sobre",11.28],["inteligência",11.44],["artificial",12.08],["e",12.64],["inovação",12.80,13.38],
 ["como",13.46],["estratégia",13.62],["empresarial",14.16,14.75],
 ["na",15.27],["Imersão",15.40],["Tecnológica",16.18],["Contábil.",16.86,17.30],
 ["Vamos",17.85],["lá?",18.16,18.30],["Participe!",18.76,19.19]]
# todas as legendas em UMA linha: a caixa fica abaixo da barba mesmo quando ele abaixa o queixo
caps = [("H","Inteligência artificial e inovação",0,3,True),("H","como estratégia empresarial",4,6),
 ("A","Olá, eu sou Angelo Loula,",7,11),("A","professor da UEFS,",12,14),
 ("A","pesquisador de inteligência artificial",15,18),
 ("A","e coordeno o programa",19,22),("A","de aceleração de startups.",23,26),
 ("A","Trabalho na Agência de Inovação",27,31),("A","e vou falar com vocês",32,36),
 ("A","sobre inteligência artificial",37,39),("A","e inovação",40,41),("A","como estratégia empresarial",42,44),
 ("A","na Imersão Tecnológica Contábil.",45,48),("A","Vamos lá? Participe!",49,51)]
captions = []
for c in caps:
    seg, text, i0, i1 = c[:4]
    got = " ".join(w[0] for w in W[i0:i1 + 1])
    norm = lambda s: s.replace("\n", " ").lower().replace(",", "").replace(".", "").replace("?", "").replace("!", "")
    assert norm(got) == norm(text), (got, text)
    d = {"seg": seg, "text": text, "w": [i0, i1]}
    if len(c) > 4: d["start_at_segment"] = True
    captions.append(d)
top = json.load(open(sys.argv[2]))   # topo da cabeça por quadro da fonte (suavizado), de geom.py
E = {
 "_doc": "Projeto editável — vídeo do Angelo Loula para o ITCONT. Tempos de origem em segundos do arquivo original (convertido para 30 fps). Edite e rode run_all.sh.",
 "fps": 30, "ext": 240, "watermark_top": 1920, "srt_name": "legendas_AngeloLoula_ITCONT.srt",
 "_ext": "240 px de teto sintetizado acima do quadro: a câmera acompanha a cabeça (head_track) e abre a faixa de títulos no topo.",
 "show_unspoken_info": True,
 "_show_unspoken_info": "Datas, horário e local não são falados por ele (vêm do planejamento do evento). false = encerramento sem essas linhas.",
 "caption_y": 1500,
 "event": {"name": "ITCONT", "full_name": "Imersão Tecnológica Contábil", "institution": "UEFS",
           "session_date": "21 e 22 de outubro de 2026", "session_time": "19h às 21h30",
           "venue_1": "Auditório III", "venue_2": "Módulo IV",
           "organizer": "Projeto de Extensão Contador do Amanhã", "cta": "Participe do ITCONT. Esperamos você!"},
 "presenter": {"name": "Angelo Loula", "role": "Professor da UEFS"},
 "segments": [
   {"id": "H", "hook": True, "label": "Gancho: 'inteligência artificial e inovação como estratégia empresarial'", "in": 344, "out": 446},
   {"id": "A", "label": "Fala completa, sem cortes internos (o encerramento cobre o fim do arquivo)", "in": 9, "out": 598}],
 "closing_frames": 160,
 "head_track": {"target_out": 440, "_doc": "a câmera sobe/desce suavemente para o topo da cabeça ficar em y≈440 na saída; sobe o quadro onde a barba desceria sobre a legenda (proj/head_track.py)",
                "top_src": top},
 "words": W, "captions": captions,
 "highlight": ["Angelo Loula", "UEFS", "inteligência artificial", "Inteligência artificial", "startups", "Agência de Inovação",
               "inovação", "estratégia empresarial", "Imersão Tecnológica Contábil", "Participe!"],
 "cues_seg": {"hook_in": "H"},
 "cues_src": {"hook_in": 11.47,
   "lt_in": 1.12, "lt_role": 2.46, "lt_role2": 3.30, "lt_out": 4.95,
   "stp_in": 5.36, "stp_kick_end": 6.12, "stp_prog": 6.27, "stp_acel": 6.64, "stp_de": 7.20, "stp_start": 7.36, "stp_out": 8.25,
   "ag_in": 8.40, "ag_kick_end": 8.82, "ag_word": 8.88, "ag_inov": 9.36, "ag_out": 9.86,
   "tema_in": 9.98, "kw_vou": 10.00, "kw_falar": 10.16, "kw_com": 10.40, "kw_voces": 10.56, "kw_voces_end": 10.92, "kw_sobre": 11.28, "tema_kick_end": 11.42, "tema_ia": 11.44, "tema_art": 12.08, "tema_e": 12.64, "tema_inov": 12.80,
   "tema_como": 13.46, "tema_estr": 13.62, "tema_emp": 14.16, "tema_out": 14.95,
   "logo_in": 15.36, "imt_im": 15.40, "imt_tec": 16.18, "imt_cont": 16.86, "logo_out": 17.62,
   "final_in": 17.85, "final_la": 18.16, "final_part": 18.76,
   "closing_wipe": 19.42, "music_drop": 5.45, "final_duck": 18.70},
 "_camera_src": "sem zoom: qualquer aproximação desceria a barba sobre a legenda; o movimento vem do acompanhamento da cabeça",
 "camera_src": [["H","start",1.0,0,"cut"],["A","start",1.0,0,"cut"]],
 "sfx": [["whoosh","seg_H_t0",0.5,0.02],["hit","seg_H_t0",0.3],["whoosh","seg_H_t1",0.85,-0.18],
   ["pop","lt_in",0.7],["tick","lt_role",0.5],["tick","lt_role2",0.45],
   ["tick","stp_prog",0.35],["pop","stp_start",0.45],["whoosh","stp_out",0.28],
   ["tick","ag_word",0.35],["pop","ag_inov",0.4],
   ["tick","tema_ia",0.4],["whoosh","tema_como",0.3],["tick","tema_emp",0.35],["whoosh","tema_out",0.28],
   ["impact","logo_in",0.42,-0.04],["tick","imt_tec",0.3],["tick","imt_cont",0.3],
   ["pop","final_in",0.45],["pop","final_part",0.5],
   ["whoosh","closing_wipe",0.55,0.12],["impact","closing_wipe",0.55,0.66]]}
json.dump(E, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
print("ok", len(W), "palavras", len(captions), "legendas")
