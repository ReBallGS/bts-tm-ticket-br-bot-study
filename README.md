# BTS Ticket Automation Bot (Study Project)

## 🇺🇸 English

⚠️ This project is for educational purposes only.
This project is not affiliated with or endorsed by BTS or any related entities.

This project simulates high-demand scenarios to study performance and real-time decision making in web applications.

This script demonstrates browser automation techniques such as:

* DOM interaction
* Network request interception
* Dynamic element detection
* Adaptive refresh strategies

### Features

* Real-time availability monitoring
* Real-time seat availability tracking
* Smart retry system with random delays
* "Turbo mode" when availability is detected
* Network interception (fetch/XHR)

### Tech Stack

* JavaScript
* Tampermonkey
* Browser APIs

### How to use

1. Install Tampermonkey
2. Add the script
3. Open a supported event page
4. Let the script monitor availability

### Disclaimer

This project is intended for educational and research purposes only.
It does not aim to bypass platform protections or violate any terms of service.

How it works (Technical Overview)

This script continuously monitors event pages and applies different strategies to detect availability in real time.

Key mechanisms include:

DOM Interaction
Automatically detects and interacts with key UI elements such as ticket lists, buttons, and quantity selectors.
Network Interception (fetch/XHR hook)
Hooks into browser network requests to identify internal endpoints related to seat availability.
Dynamic Endpoint Discovery
Extracts seat availability endpoints from scripts, network traffic, and fallback paths.
Adaptive Polling System
Adjusts refresh intervals dynamically based on availability status and configured profiles.
Smart Retry Logic
Implements randomized delays and retry strategies to simulate natural user behavior.
Turbo Mode Activation
When availability is detected, the script increases execution frequency for faster response.
Multi-Flow Handling
Supports different flows such as:
Quick picks / filter panel
General admission
Direct buy button detection
Popup & UI Handling
Automatically dismisses common modals and consent popups to maintain flow continuity.
Cart Detection & Alerts
Detects when items reach the cart and triggers visual/audio alerts.

This project focuses on studying real-time automation behavior in high-demand web environments.

---

## 🇧🇷 Português

⚠️ Este projeto é apenas para fins educacionais.
Este projeto não é afiliado nem possui qualquer relação com o BTS.

Este projeto simula cenários de alta demanda para estudo de performance e tomada de decisão em tempo real em aplicações web.

Este script demonstra técnicas de automação no navegador como:

* Interação com DOM
* Interceptação de requisições de rede
* Detecção dinâmica de elementos
* Estratégias adaptativas de atualização

### Funcionalidades

* Monitoramento de disponibilidade em tempo real
* Rastreamento de assentos disponíveis
* Sistema de repetição com delay aleatório
* "Modo turbo" quando disponibilidade é detectada
* Interceptação de rede (fetch/XHR)

### Tecnologias

* JavaScript
* Tampermonkey
* APIs do navegador

### Como usar

1. Instale o Tampermonkey
2. Adicione o script
3. Abra a página do evento suportado
4. Deixe o script monitorando

Como funciona (Visão Técnica)

Este script monitora continuamente páginas de eventos e aplica diferentes estratégias para detectar disponibilidade em tempo real.

Principais mecanismos:

Interação com DOM
Detecta e interage automaticamente com elementos da interface como listas de ingressos, botões e seletores de quantidade.
Interceptação de Rede (hook em fetch/XHR)
Intercepta requisições do navegador para identificar endpoints internos relacionados à disponibilidade de assentos.
Descoberta Dinâmica de Endpoints
Extrai endpoints de disponibilidade a partir de scripts da página, tráfego de rede e caminhos de fallback.
Sistema de Polling Adaptativo
Ajusta dinamicamente os intervalos de atualização com base na disponibilidade e no perfil configurado.
Lógica de Repetição Inteligente
Utiliza delays aleatórios e estratégias de repetição para simular comportamento natural do usuário.
Ativação do Modo Turbo
Quando a disponibilidade é detectada, aumenta a frequência de execução para resposta mais rápida.
Suporte a Múltiplos Fluxos
Suporta diferentes fluxos de interação como:
Quick picks / lista de ingressos
General admission
Detecção direta de botão de compra
Tratamento de Pop-ups e Interface
Fecha automaticamente modais e avisos para manter o fluxo contínuo.
Detecção de Carrinho e Alertas
Detecta quando itens entram no carrinho e dispara alertas visuais/sonoros.

Este projeto tem como foco o estudo de automação em tempo real em ambientes web de alta demanda.

### Aviso

Este projeto é destinado apenas para fins educacionais e de estudo.
Não tem como objetivo burlar sistemas ou violar termos de uso.
