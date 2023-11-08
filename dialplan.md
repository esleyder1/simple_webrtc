;Interactive Voice
[ivr]
exten => 400,1,Answer()
    same => n, agi(googletts.agi,"Gracias por llamar a Eagle Taxis",es)
    same => n,WaitExten(5)
    same => n, agi(googletts.agi,"Dial 1 for Spanish, press 2 for English",en)
    same => n, agi(googletts.agi,"Gracias por llamar a Eagle Taxis",es)
    same => n,WaitExten(5)


;Queues
[dispatchers]

exten => 200,1,Answer()
same => n,Queue(DispatcherQueue)
same => n,Hangup()

exten => transfer,1,Dial(PJSIP/300) ; Llama a la extensión de soporte

; Opción para poner en espera
exten => 2,1,NoOp(Agente presiona 2 para poner en espera)
same => n,Background(hold-music) ; Reproduce música de espera
same => n,WaitExten(10) ; Espera la entrada del agente

exten => 300,1,NoOp()
        same => n,Answer()
        same => n,SayAlpha('Please wait')
        same => n,Wait(1.25)
        same => n,Dial(PJSIP/300,30)

