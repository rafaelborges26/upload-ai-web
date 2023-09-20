import { ChangeEvent, FormEvent, useState, useMemo, useRef } from 'react'
import { FileVideo, Upload } from 'lucide-react'
import { Textarea } from './ui/textarea';
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Separator } from './ui/separator';
import { getFFmpeg } from '@/lib/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { api } from '@/lib/axios';

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'
const statusMessages = {
  converting: 'Convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!'
}

export function VideoInputForm() {

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')
  
  const promptInputRef = useRef<HTMLTextAreaElement>(null)


  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if(!files) {
      return
    }

    const selectedFile = files[0]

    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    
    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile('input.mp4', await fetchFile(video)) 
    console.log('entrou')
    //ffmpeg.on('log', log => {
    //  console.log(log)
    //})

    ffmpeg.on('progress', progress => {
      console.log('Convert progress:' + Math.round(progress.progress * 100))
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4', //entrada
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3' //saida
    ])

    const data = await ffmpeg.readFile('output.mp3')

    //ler o arquivo de audio
    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg'
    })

    console.log('convert finished')

    return audioFile

  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    console.log('entrou')

    const prompt = promptInputRef.current?.value

    if(!videoFile) {
      return
    }
    
    setStatus('converting')
    //converter o video em audio porque a openAI aceita pouco espaço e audio será menos espaço
    const audioFile = await convertVideoToAudio(videoFile)

    //enviar arquivo via http

    const data = new FormData()
    data.append('file', audioFile)

    setStatus('uploading')

    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    setStatus('generating')
    
    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    })

    setStatus('success')

    console.log(response.data)

    console.log(audioFile)

    console.log('finalizou')
    
  }

  const previewUrl = useMemo(() => {
    if(!videoFile){
      return null
    } else {
      return URL.createObjectURL(videoFile) //criar pre visualizador de video
    }
  },[videoFile])

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
    <label htmlFor="video" className='relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col items-center justify-center text-muted-foreground hover:bg-primary/5'>
      { previewUrl ? <video src={previewUrl} controls={false} className='pointer-events-none absolute inset-0' /> : ( //exibir pre visualizador de video
        <>
        <FileVideo className='w-4 h-4' />
        Selecione um vídeo
        </>
      ) }
    </label>
    <input type="file" id="video" onChange={handleFileSelected} accept='video/mp4' className='sr-only'/>

    <Separator />

    <div className='space-y-2'>
      <Label htmlFor='transcription_prompt' >Prompt de transcrição</Label>
      <Textarea disabled={status !== 'waiting'} ref={promptInputRef} id="transcription_prompt" className='h-20 leading-relaxed resize-none' placeholder='Inclua palavras-chave mencionadas no vídeo separadas por (,)' />
    </div>

    <Button data-color={status === 'success'} disabled={status !== 'waiting'} type='submit' className='w-full data-[color=true]:bg-emerald-400'>
      { status === 'waiting' ? (
        <>
        Carregar vídeo
        <Upload className='w-4 h-4 ml-2' /></>
      ) : statusMessages[status]  }
    </Button>

    </form>  
  )

}