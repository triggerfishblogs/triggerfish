---
title: Ich habe den AI-Agenten gebaut, den ich mir gewünscht habe
date: 2026-03-09
description: Ich habe Triggerfish entwickelt, weil jeder AI-Agent, den ich fand,
  darauf vertraute, dass das Modell seine eigenen Regeln durchsetzt. Das ist keine
  Sicherheit. Hier ist, was ich stattdessen getan habe.
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - open source
  - self-hosted
  - llm
  - prompt injection
  - agent security
  - triggerfish
draft: false
---
Vor einiger Zeit begann ich, genau hinzuschauen, was AI-Agenten tatsächlich leisten können. Nicht die Demos. Die echten Systeme, die auf echten Daten laufen, in echten Umgebungen, in denen Fehler Konsequenzen haben. Was ich feststellte: Die Fähigkeiten waren wirklich beeindruckend. Man konnte einen Agenten mit E-Mail, Kalender, Code und Dateien verbinden, und er konnte sinnvolle Arbeit leisten. Das hat mich überzeugt.

Was mich nicht überzeugt hat, war das Sicherheitsmodell. Oder besser gesagt: dessen Abwesenheit. Jede Plattform, die ich mir angesehen habe, setzte ihre Regeln auf die gleiche Weise durch: indem sie dem Modell sagte, was es nicht tun sollte. Man schreibt einen guten System Prompt, beschreibt die Grenzen und vertraut darauf, dass das Modell sich daran hält. Das funktioniert so lange, bis jemand herausfindet, wie man eine Anfrage so formuliert, dass das Modell zu dem Schluss kommt, die Regeln gelten hier, jetzt, in genau diesem Fall nicht. Und solche Leute gibt es. Es ist nicht besonders schwer.

Ich wartete darauf, dass jemand die Version baut, die ich tatsächlich nutzen wollte. Eine, die sich mit allem verbinden lässt, über alle Kanäle funktioniert, die ich bereits nutze, und mit wirklich sensiblen Daten umgehen kann, ohne dass ich die Daumen drücken und hoffen muss, dass das Modell gerade einen guten Tag hat. Sie kam nicht.

Also habe ich sie selbst gebaut.

Triggerfish ist der Agent, den ich mir gewünscht habe. Er verbindet sich mit Ihrer E-Mail, Ihrem Kalender, Ihren Dateien, Ihrem Code, Ihren Messaging-Apps. Er arbeitet proaktiv, nicht nur wenn Sie ihn ansprechen. Er funktioniert dort, wo Sie bereits arbeiten. Aber der Teil, den ich am ernstesten nehme, ist die Sicherheitsarchitektur. Die Regeln darüber, worauf der Agent zugreifen darf und wohin Daten fließen können, stehen nicht in einem Prompt. Sie befinden sich in einer Durchsetzungsschicht, die vollständig außerhalb des Modells liegt. Das Modell teilt dem System mit, was es tun möchte, und eine separate Schicht entscheidet, ob das tatsächlich geschieht. Das Modell kann mit dieser Schicht nicht verhandeln. Es kann sie nicht umgehen. Es kann sie nicht sehen.

Dieser Unterschied ist bedeutsamer, als er zunächst klingen mag. Er bedeutet, dass die Sicherheitseigenschaften des Systems nicht nachlassen, wenn das Modell leistungsfähiger wird. Er bedeutet, dass ein kompromittiertes Drittanbieter-Tool den Agenten nicht dazu bringen kann, etwas zu tun, das er nicht tun sollte. Er bedeutet, dass Sie die Regeln tatsächlich lesen, verstehen und ihnen vertrauen können, denn sie sind Code, nicht Prosa.

Ich habe den Kern der Durchsetzungsschicht genau aus diesem Grund als Open Source veröffentlicht. Wenn Sie es nicht lesen können, können Sie ihm nicht vertrauen. Das gilt für jede Sicherheitsaussage, und es gilt besonders dann, wenn das, was Sie absichern, ein autonomer Agent mit Zugriff auf Ihre sensibelsten Daten ist.

Die Plattform ist für Einzelpersonen kostenlos, und Sie können sie selbst betreiben. Wenn Sie sich nicht um die Infrastruktur kümmern möchten, gibt es ein Abonnement, bei dem wir Modell und Suche bereitstellen. In beiden Fällen ist das Sicherheitsmodell dasselbe.

Das ist der Agent, den ich mir vor zwei Jahren gewünscht habe. Ich glaube, viele Menschen haben auf dasselbe gewartet.
