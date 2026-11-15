
package com.plataforma.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EstadoController {

    @GetMapping("/api/estado")
    public EstadoResponse obtenerEstado() {

        return new EstadoResponse(
                "La plataforma macroeconómica está funcionando correctamente",
                "OK"
        );
    }

    public record EstadoResponse(String mensaje, String estado) {
    }
}
