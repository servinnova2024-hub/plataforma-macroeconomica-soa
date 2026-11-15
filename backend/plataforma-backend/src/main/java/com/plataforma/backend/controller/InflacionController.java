
package com.plataforma.backend.controller;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.plataforma.backend.service.InflacionService;

@RestController
public class InflacionController {

    private final InflacionService inflacionService;

    public InflacionController(InflacionService inflacionService) {
        this.inflacionService = inflacionService;
    }

    @GetMapping(
        value = "/api/bcrp/inflacion",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> consultarInflacion()
            throws IOException, InterruptedException {

        String datos = inflacionService.consultarInflacion();

        return ResponseEntity.ok(datos);
    }
}
