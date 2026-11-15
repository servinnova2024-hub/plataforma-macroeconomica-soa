
package com.plataforma.backend.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.springframework.stereotype.Service;

@Service
public class MefService {

    private final HttpClient cliente = HttpClient.newHttpClient();

    public String consultarEjecucionGasto()
            throws IOException, InterruptedException {

        String url = "https://api.datosabiertos.mef.gob.pe/"
                + "DatosAbiertos/v1/datastore_search"
                + "?resource_id=d8052fcc-f68d-465f-88f1-3ba226325bbf"
                + "&limit=5";

        HttpRequest solicitud = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .header("Accept", "application/json")
                .build();

        HttpResponse<String> respuesta = cliente.send(
                solicitud,
                HttpResponse.BodyHandlers.ofString()
        );

        if (respuesta.statusCode() != 200) {
            throw new IOException(
                "Error de conexión con el MEF. Código HTTP: "
                + respuesta.statusCode()
            );
        }

        return respuesta.body();
    }
}

