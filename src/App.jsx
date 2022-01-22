import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { mockUsers } from './mockUsers';
import { CanvasContainer, Container, VideoContainer } from './globalStyles';

export const App = () => {
  const [initializing, setInitializing] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();
  const videoHeight = 488;
  const videoWidth = 640;

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      setInitializing(true);
      Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      ]).then(startVideo);
    };

    loadModels();
  }, []);

  const startVideo = () => {
    navigator.getUserMedia(
      { video: {} },
      (stream) => (videoRef.current.srcObject = stream),
      (err) => console.error(err)
    );

    handleVideoOnPlay();
  };

  const handleVideoOnPlay = async () => {
    const labeledDescriptors = await loadLabeledImages();

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.49);

    setInterval(async () => {
      if (initializing) {
        setInitializing(false);
      }

      canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
        videoRef.current
      );

      const displaySize = {
        width: videoWidth,
        height: videoHeight,
      };

      faceapi.matchDimensions(canvasRef.current, displaySize);

      const detections = await faceapi
        .detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      canvasRef.current
        .getContext('2d')
        .clearRect(0, 0, videoWidth, videoHeight);

      const results = resizedDetections.map((d) => {
        return faceMatcher.findBestMatch(d.descriptor);
      });

      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: result.toString(),
        });
        drawBox.draw(canvasRef.current);
      });
    }, 100);
  };

  const loadLabeledImages = () => {
    return Promise.all(
      mockUsers.map(async (user) => {
        const label = user.name;
        const descriptions = [];

        for (const image of user.img) {
          const img = await faceapi.fetchImage(image);

          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          descriptions.push(detections.descriptor);
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  };

  return (
    <Container>
      <h1>Welcome to Time Stamp with IA</h1>
      <span>{initializing ? 'Initializing' : 'Ready'}</span>
      <VideoContainer>
        <video
          ref={videoRef}
          autoPlay
          muted
          height={videoHeight}
          width={videoWidth}
          onPlay={handleVideoOnPlay}
        />
        <CanvasContainer ref={canvasRef} />
      </VideoContainer>
    </Container>
  );
};
